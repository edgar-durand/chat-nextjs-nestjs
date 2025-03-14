import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { useAuth } from './AuthContext';

interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  avatar: string;
  isOnline?: boolean;
}

export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  AUDIO = 'audio'
}

export interface FileAttachment {
  filename: string;
  contentType: string;
  fileType: FileType;
  data?: string; // Base64 encoded data para archivos pequeños
  size?: number;
  fileId?: string; // ID para archivos grandes almacenados por separado
  isLargeFile?: boolean; // Indica si el archivo está almacenado por separado
  isChunk?: boolean;
  originalFilename?: string;
  chunkIndex?: number;
  totalChunks?: number;
  tempId?: string; // ID temporal para seguimiento de carga
}

interface Message {
  _id: string;
  content?: string;
  attachments?: FileAttachment[];
  sender: User;
  recipient?: string;
  room?: string;
  isRead: boolean;
  createdAt: string;
}

interface Room {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  creator: User;
  members: User[];
  isPrivate: boolean;
  createdAt: string;
  removed?: boolean;
}

interface ChatContextType {
  activeChat: { type: 'private' | 'room', id: string } | null;
  messages: Message[];
  rooms: Room[];
  onlineUsers: Record<string, boolean>;
  users: User[];
  typingUsers: Record<string, boolean | string>;
  isLoading: boolean;
  isLoadingMessages: boolean;
  unreadMessages: Record<string, number>;
  uploadingFiles: Record<string, { progress: number, error?: string }>;
  setActiveChat: (chat: { type: 'private' | 'room', id: string } | null) => void;
  sendMessage: (content: string, selectedFile: File | null) => Promise<void>;
  markAsRead: (messageId: string) => void;
  startTyping: () => void;
  stopTyping: () => void;
  loadMoreMessages: (page: number) => Promise<number>;
  retryFileUpload: (file: FileAttachment) => void;
  cancelFileUpload: (file: FileAttachment) => void;
  deleteMessage: (messageId: string, deleteForEveryone: boolean) => Promise<boolean>;
}

const ChatContext = createContext<ChatContextType>({
  activeChat: null,
  messages: [],
  rooms: [],
  onlineUsers: {},
  users: [],
  typingUsers: {},
  isLoading: true,
  isLoadingMessages: false,
  unreadMessages: {},
  uploadingFiles: {},
  setActiveChat: () => {},
  sendMessage: async () => {},
  markAsRead: () => {},
  startTyping: () => {},
  stopTyping: () => {},
  loadMoreMessages: async () => 0,
  retryFileUpload: () => {},
  cancelFileUpload: () => {},
  deleteMessage: async () => false,
});

export const useChat = () => useContext(ChatContext);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [activeChat, setActiveChat] = useState<{ type: 'private' | 'room', id: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean | string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState<Record<string, number>>({});
  const [uploadingFilesByChat, setUploadingFilesByChat] = useState<{
    [chatId: string]: {
      [fileId: string]: {
        progress: number;
        error?: string;
      }
    }
  }>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const uploadingFiles = useMemo(() => {
    if (!activeChat) return {};
    const chatId = `${activeChat.type}-${activeChat.id}`;
    return uploadingFilesByChat[chatId] || {};
  }, [activeChat, uploadingFilesByChat]);

  const updateUploadingFiles = useCallback((
    chatId: string,
    fileId: string,
    data: { progress: number; error?: string } | null
  ) => {
    console.log(`Actualizando estado de archivo ${fileId} en chat ${chatId}:`, data);
    
    setUploadingFilesByChat(prev => {
      const newState = { ...prev };
      
      // Si no existe el chat, lo creamos
      if (!newState[chatId]) {
        newState[chatId] = {};
      }
      
      // Si data es null, eliminamos el archivo
      if (data === null) {
        if (newState[chatId][fileId]) {
          const { [fileId]: _, ...restFiles } = newState[chatId];
          newState[chatId] = restFiles;
          console.log(`Eliminado archivo ${fileId} de chat ${chatId}`);
        }
      } else {
        // Actualizamos o agregamos el archivo
        newState[chatId][fileId] = data;
        console.log(`Actualizado archivo ${fileId} en chat ${chatId} con progreso ${data.progress}%`);
      }
      
      return newState;
    });
  }, []);

  const cancelFileUpload = (file: FileAttachment) => {
    if (!file.tempId || !activeChat) return;
    
    const chatId = `${activeChat.type}-${activeChat.id}`;
    updateUploadingFiles(chatId, file.tempId, null);
  };

  const socketRef = useRef<Socket | null>(null);
  const currentActiveChatRef = useRef(activeChat);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Keep the ref in sync with the state
  useEffect(() => {
    currentActiveChatRef.current = activeChat;
  }, [activeChat]);
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  
  // Initialize socket connection when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocketConnected(false);
      return;
    }
    
    const token = localStorage.getItem('token');
    
    if (!token) return;
    
    socketRef.current = io(API_URL, {
      auth: { token },
      withCredentials: true,
      // Aumentar el tiempo de espera para permitir envío de archivos grandes
      timeout: 60000 // aumentar el tiempo de espera a 60 segundos
    });
    
    // Socket event listeners
    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      setSocketConnected(true);
    });
    
    socketRef.current.on('new_message', (message: Message) => {
      const activeChat = currentActiveChatRef.current;
      
      // Identificar la clave de chat para seguimiento de notificaciones
      let chatKey = '';
      if (message.room) {
        chatKey = `room-${message.room}`;
      } else {
        chatKey = message.sender._id === user.id ? `private-${message.recipient}` : `private-${message.sender._id}`;
      }
      
      console.log('Mensaje recibido:', message, 'Chat activo:', activeChat);
      
      // Solo agregar el mensaje si es relevante para el chat activo
      if (
        (activeChat?.type === 'private' && 
          ((message.sender._id === activeChat.id && message.recipient === user.id) || 
           (message.sender._id === user.id && message.recipient === activeChat.id))) ||
        (activeChat?.type === 'room' && message.room === activeChat.id)
      ) {
        console.log('Agregando mensaje al chat activo:', message);
        setMessages(prev => [...prev, message]);
      } 
      // Si el mensaje no es para el chat activo y no fue enviado por el usuario actual, incrementar contador
      else if (message.sender._id !== user.id && chatKey) {
        console.log('New message notification:', chatKey, message);
        setUnreadMessages(prev => ({
          ...prev,
          [chatKey]: (prev[chatKey] || 0) + 1
        }));
      }
    });
    
    socketRef.current.on('user_status_change', ({ userId, isOnline }) => {
      setOnlineUsers(prev => ({ ...prev, [userId]: isOnline }));
    });
    
    socketRef.current.on('typing_indicator', (data: { userId: string, userName: string, isTyping: boolean, roomId?: string, senderId?: string }) => {
      const activeChat = currentActiveChatRef.current;
      if (
        (activeChat?.type === 'private' && data.senderId === activeChat.id) ||
        (activeChat?.type === 'room' && data.roomId === activeChat.id)
      ) {
        // Almacenar nombre en lugar de solo la bandera booleana
        setTypingUsers(prev => ({ 
          ...prev, 
          [data.userId]: data.isTyping ? data.userName : false 
        }));
      }
    });
    
    socketRef.current.on('message_read', ({ messageId }) => {
      setMessages(prev => 
        prev.map(msg => 
          msg._id === messageId ? { ...msg, isRead: true } : msg
        )
      );
    });
    
    // Handle new room creations
    socketRef.current.on('new_room', (room: Room) => {
      console.log('New room received:', room);
      setRooms(prev => {
        // Check if the room already exists
        const exists = prev.some(r => r._id === room._id);
        if (exists) return prev;
        return [...prev, room];
      });
    });
    
    // Handle room updates (members added/removed)
    socketRef.current.on('room_updated', (room: Room) => {
      console.log('Room updated:', room);
      if (room.removed) {
        // If this room was removed for this user, remove it from the list
        setRooms(prev => prev.filter(r => r._id !== room._id));
        
        // If active chat is this room, clear it
        const activeChat = currentActiveChatRef.current;
        if (activeChat?.type === 'room' && activeChat.id === room._id) {
          setActiveChat(null);
        }
      } else {
        // Update the room in the list
        setRooms(prev => prev.map(r => r._id === room._id ? room : r));
      }
    });
    
    // Escuchar eventos de eliminación de mensajes
    socketRef.current.on('message_deleted', ({ messageId, deleteForEveryone }) => {
      console.log('Mensaje eliminado recibido:', messageId, deleteForEveryone);
      if (deleteForEveryone) {
        // Si fue eliminado para todos, actualizar la UI
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
      }
    });
    
    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
      setSocketConnected(false);
    });
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocketConnected(false);
    };
  }, [isAuthenticated, user, API_URL]);
  
  // Load initial data: users and rooms
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        
        const [usersResponse, roomsResponse] = await Promise.all([
          axios.get(`${API_URL}/users`),
          axios.get(`${API_URL}/rooms/my`)
        ]);
        
        setUsers(usersResponse.data);
        setRooms(roomsResponse.data);
        
        // Set initial online status
        const initialOnlineStatus: Record<string, boolean> = {};
        usersResponse.data.forEach((user: User) => {
          initialOnlineStatus[user._id!] = user.isOnline || false;
        });
        setOnlineUsers(initialOnlineStatus);
        
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInitialData();
  }, [isAuthenticated, API_URL]);
  
  // Cuando se inicia el socket y se conecta, solicitamos el estado actual de mensajes no leídos
  useEffect(() => {
    if (socketConnected && socketRef.current && user) {
      // Solicitar mensajes no leídos al servidor
      socketRef.current.emit('get_unread_messages');
      
      // Escuchar la respuesta con el recuento de mensajes no leídos
      socketRef.current.on('unread_messages_count', (unreadCounts: Record<string, number>) => {
        console.log('Received unread counts:', unreadCounts);
        setUnreadMessages(unreadCounts);
      });
      
      return () => {
        socketRef.current?.off('unread_messages_count');
      };
    }
  }, [socketConnected, user]);

  // Asegurarse de que los mensajes se marquen como leídos cuando se abre un chat
  useEffect(() => {
    if (activeChat && socketRef.current) {
      // Crear una clave para el chat actual
      const chatKey = `${activeChat.type}-${activeChat.id}`;
      
      // Resetear el contador de mensajes no leídos para este chat
      setUnreadMessages(prev => ({
        ...prev,
        [chatKey]: 0
      }));
      
      // Notificar al servidor que los mensajes se han leído
      socketRef.current.emit('mark_messages_read', {
        chatId: activeChat.id,
        chatType: activeChat.type
      });
    }
  }, [activeChat]);
  
  // Función para manejar el cambio de chat activo
  const handleActiveChatChange = (chat: { type: 'private' | 'room', id: string } | null) => {
    // Limpiar las notificaciones no leídas cuando se activa un chat
    if (chat) {
      const chatKey = `${chat.type}-${chat.id}`;
      setUnreadMessages(prev => ({
        ...prev,
        [chatKey]: 0
      }));
    }
    
    setActiveChat(chat);
  };

  // Efecto para actualizar los mensajes cuando cambia el chat activo
  useEffect(() => {
    if (!activeChat || !isAuthenticated) return;
    
    // Resetear el estado al cambiar de chat
    setMessages([]);
    setIsLoadingMessages(true);
    
    // Reiniciar estados de mensajes no leídos y archivos en carga
    if (activeChat) {
      // Limpiar mensajes no leídos
      setUnreadMessages(prev => {
        const chatKey = `${activeChat.type}-${activeChat.id}`;
        if (prev[chatKey]) {
          const newState = { ...prev };
          delete newState[chatKey];
          return newState;
        }
        return prev;
      });
      
      // Asegurarnos de que la sección "Archivos en proceso" desaparezca al cambiar de chat
      // incluso cuando ya había terminado la carga con 100%
      const chatId = `${activeChat.type}-${activeChat.id}`;
      if (chatId in uploadingFilesByChat) {
        const hasCompletedUploads = Object.values(uploadingFilesByChat[chatId])
          .some(status => status.progress === 100);
          
        if (hasCompletedUploads) {
          setUploadingFilesByChat(prev => {
            const newState = {...prev};
            delete newState[chatId];
            return newState;
          });
        }
      }
    }

    // Solicitar mensajes al servidor
    const fetchMessages = async () => {
      try {
        let endpoint = '';
        
        if (activeChat.type === 'private') {
          endpoint = `${API_URL}/chats/direct/${activeChat.id}`;
          
          // Join user room for direct messages
          socketRef.current?.emit('join_room', { userId: activeChat.id });
        } else {
          endpoint = `${API_URL}/chats/room/${activeChat.id}`;
          
          // Join room
          socketRef.current?.emit('join_room', { roomId: activeChat.id });
        }
        
        const response = await axios.get(endpoint);
        setMessages(response.data);
        
        // Marcar los mensajes como leídos en el servidor
        if (response.data.length > 0) {
          socketRef.current?.emit('mark_messages_read', {
            chatType: activeChat.type,
            chatId: activeChat.id
          });
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setIsLoadingMessages(false);
      }
    };
    
    fetchMessages();
    
    return () => {
      // Clean up - leave rooms
      if (activeChat.type === 'room') {
        socketRef.current?.emit('leave_room', { roomId: activeChat.id });
      }
    };
  }, [activeChat, user, isAuthenticated, API_URL]);
  
  // Efecto para limpiar archivos completados automáticamente
  useEffect(() => {
    // Revisa cada 2 segundos si hay archivos que están al 100% que deban eliminarse
    const cleanupInterval = setInterval(() => {
      setUploadingFilesByChat(prev => {
        const newState = {...prev};
        let hasChanges = false;
        
        // Revisar todos los chats
        Object.keys(newState).forEach(chatId => {
          // Revisar todos los archivos en ese chat
          Object.keys(newState[chatId]).forEach(fileId => {
            // Si un archivo está al 100%, eliminarlo
            if (newState[chatId][fileId].progress === 100) {
              delete newState[chatId][fileId];
              hasChanges = true;
            }
          });
          
          // Si el chat ya no tiene archivos, eliminar el chat
          if (Object.keys(newState[chatId]).length === 0) {
            delete newState[chatId];
            hasChanges = true;
          }
        });
        
        return hasChanges ? newState : prev;
      });
    }, 2000);
    
    return () => clearInterval(cleanupInterval);
  }, []);

  const sendMessage = async (content: string, selectedFile: File | null) => {
    if (!socketRef.current || !activeChat) return;
    
    try {
      // Generar tempIds para los archivos y convertirlos a FileAttachment
      const attachmentsWithIds: FileAttachment[] = [];
      
      if (selectedFile) {
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        // Determinar tipo de archivo de forma segura
        let fileType = FileType.DOCUMENT;
        const fileTypeString = selectedFile.type || ''; // Usar string vacío si type es undefined
        if (fileTypeString.startsWith('image/')) {
          fileType = FileType.IMAGE;
        } else if (fileTypeString.startsWith('video/')) {
          fileType = FileType.VIDEO;
        } else if (fileTypeString.startsWith('audio/')) {
          fileType = FileType.AUDIO;
        } else {
          fileType = FileType.DOCUMENT;
        }
        
        // Crear objeto FileAttachment para el archivo
        const attachment: FileAttachment = {
          tempId,
          filename: selectedFile.name || 'archivo',
          contentType: selectedFile.type || 'application/octet-stream',
          fileType,
          size: selectedFile.size || 0
        };
        
        // Iniciar indicador de carga inmediatamente para todos los archivos
        const chatId = `${activeChat?.type}-${activeChat?.id}`;
        updateUploadingFiles(chatId!, tempId, { progress: 0, error: undefined });
        
        // Si es un archivo grande, lo procesamos para subida en segundo plano
        if (selectedFile.size > 5 * 1024 * 1024) { // Más de 5MB
          attachment.isLargeFile = true;
          
          // Leer como base64 para preprocesamiento
          const reader = new FileReader();
          reader.readAsDataURL(selectedFile);
          await new Promise<void>((resolve) => {
            reader.onload = () => {
              const base64data = reader.result?.toString() || '';
              // Quitar el prefijo (ej. "data:image/jpeg;base64,")
              const base64Clean = base64data.split(',')[1];
              attachment.data = base64Clean;
              resolve();
            };
          });
          
          // Agregar a la lista de adjuntos
          attachmentsWithIds.push(attachment);
          
          // Iniciar subida en segundo plano
          uploadLargeFileToServer(attachment).then(fileId => {
            if (fileId) {
              // Actualizar el attachment con el fileId
              attachment.fileId = fileId;
              attachment.isLargeFile = true;
              attachment.data = undefined; // Eliminar los datos binarios
              
              // Actualizar progreso a 100%
              updateUploadingFiles(chatId, tempId, { progress: 100, error: undefined });
            }
          }).catch(error => {
            console.error('Error subiendo archivo:', error);
            updateUploadingFiles(chatId, tempId, { progress: 0, error: error.message || 'Error al subir el archivo' });
          });
        } else {
          // Para archivos pequeños (<5MB), leerlos como base64 y enviar con el mensaje
          const reader = new FileReader();
          reader.readAsDataURL(selectedFile);
          await new Promise<void>((resolve) => {
            reader.onload = () => {
              const base64data = reader.result?.toString() || '';
              // Quitar el prefijo (ej. "data:image/jpeg;base64,")
              const base64Clean = base64data.split(',')[1];
              attachment.data = base64Clean;
              resolve();
            };
          });
          
          // Agregar a la lista de adjuntos
          attachmentsWithIds.push(attachment);
          
          // Marcar como completado también para archivos pequeños
          updateUploadingFiles(chatId, tempId, { progress: 100, error: undefined });
        }
      }
      
      // Preparar datos del mensaje
      const messageData = {
        content,
        attachments: attachmentsWithIds,
        ...(activeChat.type === 'private' ? { recipientId: activeChat.id } : { roomId: activeChat.id }),
      };
      
      console.log('Enviando mensaje:', messageData);
      
      // Enviar el mensaje a través del socket
      socketRef.current.emit('send_message', messageData, (response: any) => {
        console.log('Respuesta al enviar mensaje:', response);
        if (!response.success) {
          console.error('Error al enviar mensaje:', response.error);
        }
      });
      
      // Limpiar formulario después de enviar
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSelectedFile(null);
    } catch (error: any) {
      console.error('Error al procesar mensaje:', error);
    }
  };
  
  const createRoom = async (name: string, description = '', isPrivate = false, members: string[] = []) => {
    try {
      const { data } = await axios.post(`${API_URL}/rooms`, {
        name,
        description,
        isPrivate,
        members,
      });
      
      // No need to manually add to rooms array, the socket event will handle it
      return data;
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  };
  
  const updateRoom = async (roomId: string, updateData: { name?: string; description?: string; image?: string; isPrivate?: boolean }) => {
    try {
      const { data } = await axios.put(`${API_URL}/rooms/${roomId}`, updateData);
      
      // Update the room in the local state to immediately reflect changes
      setRooms(prevRooms => 
        prevRooms.map(room => 
          room._id === roomId ? { ...room, ...data } : room
        )
      );
      
      return data;
    } catch (error) {
      console.error('Error updating room:', error);
      throw error;
    }
  };
  
  const joinRoom = async (roomId: string, userId?: string) => {
    if (!user && !userId) return;
    
    try {
      // If userId is provided, use it (for admin adding others)
      // Otherwise use current user's ID (for self-joining)
      const targetUserId = userId || user!.id;
      await axios.post(`${API_URL}/rooms/${roomId}/members/${targetUserId}`);
      // Room update will be handled by socket event
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  };
  
  const leaveRoom = async (roomId: string, userId?: string) => {
    if (!user && !userId) return;
    
    try {
      // If userId is provided, use it (for admin removing others)
      // Otherwise use current user's ID (for self-leaving)
      const targetUserId = userId || user!.id;
      await axios.delete(`${API_URL}/rooms/${roomId}/members/${targetUserId}`);
      // Room update will be handled by socket event
    } catch (error) {
      console.error('Error leaving room:', error);
      throw error;
    }
  };
  
  const setTyping = (isTyping: boolean) => {
    if (!activeChat || !socketRef.current) return;
    
    const typingData = {
      isTyping,
      ...(activeChat.type === 'private' ? { recipientId: activeChat.id } : { roomId: activeChat.id }),
    };
    
    socketRef.current.emit('typing', typingData);
  };
  
  const clearChatHistory = async (recipientId: string) => {
    try {
      const response = await axios.delete(`${API_URL}/chats/direct/${recipientId}`);
      return { success: true, message: 'Chat history cleared successfully' };
    } catch (error) {
      console.error('Error clearing chat history:', error);
      return { success: false, message: 'Failed to clear chat history' };
    }
  };
  
  // Implementación de retryFileUpload
  const retryFileUpload = (file: FileAttachment) => {
    if (!file.tempId) return;
    
    // Reset progress
    const chatId = `${activeChat?.type}-${activeChat?.id}`;
    updateUploadingFiles(chatId!, file.tempId!, { progress: 0, error: undefined });
    
    // Prepare for re-upload
    if (file.data) {
      // Es un archivo ya convertido a base64
      uploadLargeFileToServer(file);
    } else if (file.fileId) {
      // Remover el error pero mantener el progreso como completado
      // ya que el archivo ya está subido
      updateUploadingFiles(chatId!, file.tempId!, { progress: 100, error: undefined });
    }
  };
  
  // Función auxiliar para subir un archivo grande directamente al servidor
  const uploadLargeFileToServer = async (attachment: FileAttachment): Promise<string | null> => {
    if (!attachment.tempId) {
      attachment.tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    
    try {
      // Convertir datos base64 a Blob para subir
      const base64Data = attachment.data || '';
      const byteCharacters = atob(base64Data);
      const byteArrays = [];
      
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      const blob = new Blob(byteArrays, { type: attachment.contentType });
      const file = new File([blob], attachment.filename, { type: attachment.contentType });
      
      // Crear FormData para la subida
      const formData = new FormData();
      formData.append('file', file);
      
      // Iniciar la carga y actualizar el estado
      const chatId = `${activeChat?.type}-${activeChat?.id}`;
      updateUploadingFiles(chatId!, attachment.tempId!, { progress: 0, error: undefined });
      
      // Realizar la subida con seguimiento de progreso
      const response = await axios.post(`${API_URL}/file-storage/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = progressEvent.total 
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
            
          console.log(`Progreso de subida para ${attachment.tempId}: ${percentCompleted}%`);
          updateUploadingFiles(chatId!, attachment.tempId!, { progress: percentCompleted, error: undefined });
          
          // Si el archivo ha terminado de cargarse (100%), lo eliminamos de la lista después de un segundo
          if (percentCompleted === 100) {
            console.log(`Subida completada para ${attachment.tempId}, eliminando en 1 segundo`);
            // Esperar un segundo para que el usuario vea que se completó y luego eliminar
            setTimeout(() => {
              updateUploadingFiles(chatId!, attachment.tempId!, null);
            }, 1000);
          }
        }
      });
      
      if (response.data && response.data.fileId) {
        return response.data.fileId;
      }
      return null;
    } catch (error: any) {
      console.error('Error al subir archivo:', error);
      const chatId = `${activeChat?.type}-${activeChat?.id}`;
      updateUploadingFiles(chatId!, attachment.tempId!, { 
        progress: 0, 
        error: error.message || 'Error al subir el archivo'
      });
      return null;
    }
  };
  
  // Esta función se encarga de marcar un mensaje como leído
  const handleMarkAsRead = (messageId: string) => {
    if (!socketRef.current) return;
    
    socketRef.current.emit('mark_message_read', { messageId });
    
    // Actualizar el estado de mensajes localmente
    setMessages(prev => 
      prev.map(msg => 
        msg._id === messageId ? { ...msg, isRead: true } : msg
      )
    );
  };
  
  // Esta función carga más mensajes para la paginación
  const fetchMoreMessages = async (page: number) => {
    if (!activeChat || !user || !isAuthenticated) return;
    
    try {
      let endpoint = '';
      
      if (activeChat.type === 'private') {
        endpoint = `${API_URL}/chats/direct/${activeChat.id}?page=${page}`;
      } else {
        endpoint = `${API_URL}/chats/room/${activeChat.id}?page=${page}`;
      }
      
      const response = await axios.get(endpoint);
      
      // Añadir los mensajes anteriores al inicio del array de mensajes
      setMessages(prev => [...response.data, ...prev]);
      
      return response.data.length;
    } catch (error) {
      console.error('Error al cargar más mensajes:', error);
      return 0;
    }
  };
  
  const deleteMessage = async (messageId: string, deleteForEveryone: boolean) => {
    try {
      const response = await axios.delete(`${API_URL}/chats/message/${messageId}`, {
        params: {
          deleteForEveryone,
        },
      });
      
      if (response.data.success) {
        // Eliminar el mensaje del estado local
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error al eliminar mensaje:', error);
      return false;
    }
  };
  
  return (
    <ChatContext.Provider value={{
      activeChat,
      messages,
      rooms,
      onlineUsers,
      users,
      typingUsers,
      isLoading,
      isLoadingMessages,
      unreadMessages,
      uploadingFiles,
      setActiveChat: handleActiveChatChange,
      sendMessage,
      markAsRead: handleMarkAsRead,
      startTyping: () => setTyping(true),
      stopTyping: () => setTyping(false),
      loadMoreMessages: fetchMoreMessages,
      retryFileUpload,
      cancelFileUpload,
      deleteMessage,
    }}>
      {children}
    </ChatContext.Provider>
  );
};
