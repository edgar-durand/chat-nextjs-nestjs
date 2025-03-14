import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  unreadMessages: Record<string, number>;
  uploadingFiles: { [key: string]: { progress: number, error?: string } };
  setActiveChat: (chat: { type: 'private' | 'room', id: string } | null) => void;
  sendMessage: (content: string, attachments?: FileAttachment[]) => Promise<void>;
  createRoom: (name: string, description?: string, isPrivate?: boolean, members?: string[]) => Promise<Room>;
  updateRoom: (roomId: string, data: { name?: string; description?: string; image?: string; isPrivate?: boolean }) => Promise<Room>;
  joinRoom: (roomId: string, userId?: string) => Promise<void>;
  leaveRoom: (roomId: string, userId?: string) => Promise<void>;
  setTyping: (isTyping: boolean) => void;
  clearChatHistory: (recipientId: string) => Promise<{ success: boolean, message: string }>;
}

const ChatContext = createContext<ChatContextType>({
  activeChat: null,
  messages: [],
  rooms: [],
  onlineUsers: {},
  users: [],
  typingUsers: {},
  isLoading: true,
  unreadMessages: {},
  uploadingFiles: {},
  setActiveChat: () => {},
  sendMessage: async () => {},
  createRoom: async () => ({ 
    _id: '', 
    name: '', 
    creator: { id: '', _id: '', name: '', email: '', avatar: '' }, 
    members: [], 
    isPrivate: false, 
    createdAt: '' 
  }),
  updateRoom: async () => ({ 
    _id: '', 
    name: '', 
    creator: { id: '', _id: '', name: '', email: '', avatar: '' }, 
    members: [], 
    isPrivate: false, 
    createdAt: '' 
  }),
  joinRoom: async () => {},
  leaveRoom: async () => {},
  setTyping: () => {},
  clearChatHistory: async () => ({ success: false, message: 'Not implemented' }),
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
  const [socketConnected, setSocketConnected] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState<Record<string, number>>({});
  const [uploadingFiles, setUploadingFiles] = useState<{ [key: string]: { progress: number, error?: string } }>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
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
        chatKey = `room_${message.room}`;
      } else if (message.sender._id !== user.id) {
        chatKey = `user_${message.sender._id}`;
      } else if (message.recipient) {
        chatKey = `user_${message.recipient}`;
      }
      
      // Solo agregar el mensaje si es relevante para el chat activo
      if (
        (activeChat?.type === 'private' && 
          ((message.sender._id === activeChat.id && message.recipient === user.id) || 
           (message.sender._id === user.id && message.recipient === activeChat.id))) ||
        (activeChat?.type === 'room' && message.room === activeChat.id)
      ) {
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
      const chatKey = activeChat.type === 'private' 
        ? `user_${activeChat.id}` 
        : `room_${activeChat.id}`;
      
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
      const chatKey = chat.type === 'private' ? `user_${chat.id}` : `room_${chat.id}`;
      setUnreadMessages(prev => ({
        ...prev,
        [chatKey]: 0
      }));
    }
    
    setActiveChat(chat);
  };

  // Cargar mensajes cuando se selecciona un chat
  useEffect(() => {
    if (!activeChat || !user || !isAuthenticated) {
      setMessages([]);
      return;
    }
    
    setIsLoading(true);
    
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
        setIsLoading(false);
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
  
  const sendMessage = async (content: string, attachments: FileAttachment[] = []) => {
    if (!activeChat || !isAuthenticated || !socketRef.current) {
      return;
    }

    // Inicializar estado de carga para cada archivo
    const newUploadingFiles = { ...uploadingFiles };
    
    // Para archivos grandes, especialmente videos, los enviamos directamente sin fragmentar
    let processedAttachments: FileAttachment[] = [];

    // Asignar IDs temporales para seguimiento
    const attachmentsWithIds = attachments.map(attachment => ({
      ...attachment,
      tempId: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    }));

    // Establecer el estado inicial de carga para cada archivo
    attachmentsWithIds.forEach(attachment => {
      newUploadingFiles[attachment.tempId] = { progress: 0 };
    });
    setUploadingFiles(newUploadingFiles);

    try {
      for (const attachment of attachmentsWithIds) {
        // Actualizar progreso
        setUploadingFiles(prev => ({
          ...prev,
          [attachment.tempId]: { progress: 10, error: undefined }
        }));

        // Si es un video o archivo grande, lo enviamos como un único archivo
        if (attachment.fileType === FileType.VIDEO || 
            (attachment.size && attachment.size > 5 * 1024 * 1024)) {
          processedAttachments.push({
            ...attachment,
            // Agregamos una bandera para indicar que debe ser almacenado como archivo grande
            isLargeFile: true
          });

          // Actualizar progreso
          setUploadingFiles(prev => ({
            ...prev,
            [attachment.tempId]: { progress: 50, error: undefined }
          }));
        } else {
          // Para otros archivos pequeños, los enviamos tal como están
          processedAttachments.push(attachment);
        }
      }

      const messageData = {
        content,
        attachments: processedAttachments,
        ...(activeChat.type === 'private' ? { recipientId: activeChat.id } : { roomId: activeChat.id }),
      };

      // Actualizar progreso para todos los archivos
      const updatedProgress = { ...uploadingFiles };
      attachmentsWithIds.forEach(attachment => {
        updatedProgress[attachment.tempId] = { progress: 75, error: undefined };
      });
      setUploadingFiles(updatedProgress);

      // Enviar el mensaje a través del socket
      socketRef.current.emit('send_message', messageData, (response: any) => {
        if (response.success) {
          // Éxito - quitar archivos del estado de carga
          const finalProgress = { ...uploadingFiles };
          attachmentsWithIds.forEach(attachment => {
            delete finalProgress[attachment.tempId];
          });
          setUploadingFiles(finalProgress);
        } else {
          // Error - actualizar estado con el error
          const errorProgress = { ...uploadingFiles };
          attachmentsWithIds.forEach(attachment => {
            errorProgress[attachment.tempId] = { 
              progress: 0, 
              error: response.error || 'Error al enviar el mensaje' 
            };
          });
          setUploadingFiles(errorProgress);
        }
      });
      
      // Limpiar formulario después de enviar
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSelectedFile(null);
    } catch (error: any) {
      console.error('Error al procesar archivos:', error);
      // Actualizar estado con el error
      const errorProgress = { ...uploadingFiles };
      attachmentsWithIds.forEach(attachment => {
        errorProgress[attachment.tempId] = { 
          progress: 0, 
          error: error.message || 'Error al procesar archivos' 
        };
      });
      setUploadingFiles(errorProgress);
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
  
  return (
    <ChatContext.Provider value={{
      activeChat,
      messages,
      rooms,
      users,
      onlineUsers,
      typingUsers,
      isLoading,
      unreadMessages,
      uploadingFiles,
      setActiveChat: handleActiveChatChange,
      sendMessage,
      createRoom,
      updateRoom,
      joinRoom,
      leaveRoom,
      setTyping,
      clearChatHistory,
    }}>
      {children}
    </ChatContext.Provider>
  );
};
