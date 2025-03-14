const axios = require('axios');
const { faker } = require('@faker-js/faker');
const fs = require('fs');

// Configuración
const API_URL = 'http://localhost:3001';
const NUM_USERS = 100; // Cantidad de usuarios de prueba a crear
const OUTPUT_FILE = './test-users.json';

// Credenciales de administrador (si es necesario)
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'adminpassword';

// Función para generar un avatar aleatorio (URL de imagen)
function getRandomAvatar() {
  const avatarOptions = [
    `https://ui-avatars.com/api/?name=${faker.person.firstName()}+${faker.person.lastName()}&background=random`,
    `https://avatars.dicebear.com/api/bottts/${faker.string.uuid()}.svg`,
    `https://avatars.dicebear.com/api/human/${faker.string.uuid()}.svg`,
    null // Algunos usuarios sin avatar
  ];
  
  return avatarOptions[Math.floor(Math.random() * avatarOptions.length)];
}

// Función para obtener token de administrador (si es necesario)
async function getAdminToken() {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    return response.data.token;
  } catch (error) {
    console.error('Error al obtener token de administrador:', error.message);
    return null;
  }
}

// Función principal para crear usuarios
async function createTestUsers() {
  // const adminToken = await getAdminToken();
  const users = [];
  
  console.log(`Creando ${NUM_USERS} usuarios de prueba...`);
  
  for (let i = 0; i < NUM_USERS; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName, provider: 'testuser.com' });
    const password = 'testpassword123'; // Misma contraseña para todos los usuarios de prueba
    
    const userData = {
      name: `${firstName} ${lastName}`,
      email,
      password,
      avatar: getRandomAvatar()
    };
    
    try {
      // Crear usuario mediante la API
      const response = await axios.post(`${API_URL}/auth/register`, userData);
      
      // Guardar datos del usuario (sin incluir la contraseña en el archivo)
      users.push({
        id: response.data.user._id,
        name: userData.name,
        email: userData.email,
        password // Incluido solo para las pruebas
      });
      
      console.log(`Usuario creado (${i+1}/${NUM_USERS}): ${userData.email}`);
    } catch (error) {
      console.error(`Error al crear usuario ${userData.email}:`, error.message);
    }
    
    // Pequeña pausa para no sobrecargar la API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Guardar usuarios en un archivo JSON
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(users, null, 2));
  console.log(`${users.length} usuarios creados y guardados en ${OUTPUT_FILE}`);
  
  // Crear algunas salas para las pruebas
  await createTestRooms(users);
}

// Función para crear salas de prueba
async function createTestRooms(users) {
  const NUM_ROOMS = 10;
  const rooms = [];
  
  console.log(`Creando ${NUM_ROOMS} salas de prueba...`);
  
  for (let i = 0; i < NUM_ROOMS; i++) {
    // Seleccionar un usuario aleatorio como creador
    const creatorIndex = Math.floor(Math.random() * users.length);
    const creator = users[creatorIndex];
    
    // Obtener token para el creador
    try {
      // Esperar un poco entre cada intento (para evitar bloqueos por demasiadas peticiones)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const loginResponse = await axios.post(`${API_URL}/auth/login`, {
        email: creator.email,
        password: creator.password
      });
      
      if (!loginResponse.data.accessToken) {
        console.error(`No se pudo obtener token para ${creator.email}. Respuesta:`, JSON.stringify(loginResponse.data));
        continue;
      }
      
      const token = loginResponse.data.accessToken;
      
      // Crear entre 5 y 20 miembros aleatorios para la sala
      const memberCount = Math.floor(Math.random() * 15) + 5;
      const memberIds = [];
      
      // Añadir usuarios aleatorios (excluyendo duplicados)
      const availableUsers = [...users];
      for (let j = 0; j < memberCount && availableUsers.length > 0; j++) {
        const randomIndex = Math.floor(Math.random() * availableUsers.length);
        const selectedUser = availableUsers.splice(randomIndex, 1)[0];
        if (selectedUser.id !== creator.id) {
          memberIds.push(selectedUser.id);
        }
      }
      
      // Datos de la sala
      const roomData = {
        name: faker.company.name(),
        description: faker.lorem.sentence(),
        members: memberIds
      };
      
      // Crear sala
      const response = await axios.post(`${API_URL}/rooms`, roomData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      rooms.push(response.data);
      console.log(`Sala creada (${i+1}/${NUM_ROOMS}): ${roomData.name} con ${memberIds.length} miembros`);
    } catch (error) {
      console.error(`Error al crear sala con el usuario ${creator.email}:`, error.message);
      if (error.response) {
        console.error('Respuesta de error:', error.response.data);
      }
    }
    
    // Pequeña pausa entre creaciones
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`${rooms.length} salas creadas para pruebas`);
}

// Ejecutar el script
createTestUsers().catch(console.error);
