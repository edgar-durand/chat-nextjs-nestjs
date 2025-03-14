import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up to 20 users over 30 seconds
    { duration: '1m', target: 20 },    // Stay at 20 users for 1 minute
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '1m', target: 50 },    // Stay at 50 users for 1 minute
    { duration: '30s', target: 100 },  // Ramp up to 100 users
    { duration: '1m', target: 100 },   // Stay at 100 users for 1 minute
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% of requests must complete below 5 seconds
    http_req_failed: ['rate<0.15'],    // Less than 15% of requests can fail
  },
};

// Load users from the generated file
const users = new SharedArray('users', function () {
  const data = JSON.parse(open('../test-users.json'));
  return data.map(user => ({
    email: user.email,
    password: user.password
  }));
});

// API base URL
const BASE_URL = 'http://localhost:3001';

// Function to get an authentication token
function getAuthToken(email, password) {
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: email,
    password: password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  // Print debug information for the first few requests
  if (__ITER < 5) {
    console.log(`Login response for ${email}: ${loginRes.status}, body length: ${loginRes.body.length}`);
    try {
      const response = JSON.parse(loginRes.body);
      console.log(`Login token exists: ${response.accessToken !== undefined}`);
    } catch (e) {
      console.error(`Error parsing login response: ${e.message}`);
    }
  }
  
  const success = loginRes.status === 201 && loginRes.json().accessToken !== undefined;
  check(loginRes, {
    'login successful': () => success,
  });
  
  if (!success) {
    console.error(`Login failed for ${email} with status ${loginRes.status}`);
    return null;
  }
  
  return loginRes.json().accessToken;
}

// Main scenario
export default function () {
  // Select a random user
  const user = users[Math.floor(Math.random() * users.length)];
  
  // Authenticate and get token
  const token = getAuthToken(user.email, user.password);
  
  // Configure headers with the token
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  // 1. Get the list of rooms
  const roomsRes = http.get(`${BASE_URL}/rooms`, { headers });
  check(roomsRes, {
    'get rooms successful': (r) => r.status === 200,
  });
  
  // 2. Get the list of users
  const usersRes = http.get(`${BASE_URL}/users`, { headers });
  check(usersRes, {
    'get users successful': (r) => r.status === 200,
  });
  
  // 3. Create a new room (only some users will do this)
  if (Math.random() < 0.1) {
    const roomName = `Room-${randomString(8)}`;
    const createRoomRes = http.post(`${BASE_URL}/rooms`, JSON.stringify({
      name: roomName,
      description: 'Test room for load testing',
    }), { headers });
    
    check(createRoomRes, {
      'create room successful': (r) => r.status === 201,
    });
  }
  
  // Simulate real behavior with pauses between actions
  sleep(Math.random() * 3);
}
