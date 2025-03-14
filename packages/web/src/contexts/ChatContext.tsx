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

interface Message {
  _id: string;
  content: string;
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
  typingUsers: Record<string, boolean>;
  isLoading: boolean;
  setActiveChat: (chat: { type: 'private' | 'room', id: string } | null) => void;
  sendMessage: (content: string) => Promise<void>;
  createRoom: (name: string, description?: string, isPrivate?: boolean, members?: string[]) => Promise<Room>;
  updateRoom: (roomId: string, data: { name?: string; description?: string; image?: string; isPrivate?: boolean }) => Promise<Room>;
  joinRoom: (roomId: string, userId?: string) => Promise<void>;
  leaveRoom: (roomId: string, userId?: string) => Promise<void>;
  setTyping: (isTyping: boolean) => void;
}

const ChatContext = createContext<ChatContextType>({
  activeChat: null,
  messages: [],
  rooms: [],
  onlineUsers: {},
  users: [],
  typingUsers: {},
  isLoading: true,
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
});

export const useChat = () => useContext(ChatContext);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [activeChat, setActiveChat] = useState<{ type: 'private' | 'room', id: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);
  const currentActiveChatRef = useRef(activeChat);
  
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
    });
    
    // Socket event listeners
    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      setSocketConnected(true);
    });
    
    socketRef.current.on('new_message', (message: Message) => {
      const activeChat = currentActiveChatRef.current;
      // Only add the message if it's relevant to the active chat
      if (
        (activeChat?.type === 'private' && 
          ((message.sender._id === activeChat.id && message.recipient === user.id) || 
           (message.sender._id === user.id && message.recipient === activeChat.id))) ||
        (activeChat?.type === 'room' && message.room === activeChat.id)
      ) {
        setMessages(prev => [...prev, message]);
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
        setTypingUsers(prev => ({ ...prev, [data.userId]: data.isTyping }));
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
  
  // Load messages when activeChat changes
  useEffect(() => {
    if (!activeChat || !isAuthenticated || !socketConnected) {
      setMessages([]);
      return;
    }
    
    const fetchMessages = async () => {
      try {
        setIsLoading(true);
        let response;
        
        if (activeChat.type === 'private') {
          response = await axios.get(`${API_URL}/chats/direct/${activeChat.id}`);
          
          // Join user room for direct messages
          socketRef.current?.emit('join_room', { userId: activeChat.id });
        } else {
          response = await axios.get(`${API_URL}/chats/room/${activeChat.id}`);
          
          // Join room
          socketRef.current?.emit('join_room', { roomId: activeChat.id });
        }
        
        setMessages(response.data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMessages();
    
    // Clear typing indicator when changing chats
    setTypingUsers({});
    
    return () => {
      // Leave previous chat room
      if (activeChat.type === 'private') {
        socketRef.current?.emit('leave_room', { userId: activeChat.id });
      } else {
        socketRef.current?.emit('leave_room', { roomId: activeChat.id });
      }
    };
  }, [activeChat, isAuthenticated, API_URL, socketConnected]);
  
  const sendMessage = async (content: string) => {
    if (!activeChat || !user || !socketRef.current) return;
    
    try {
      const messageData = {
        content,
        ...(activeChat.type === 'private' ? { recipientId: activeChat.id } : { roomId: activeChat.id }),
      };
      
      socketRef.current.emit('send_message', messageData);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
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
  
  return (
    <ChatContext.Provider value={{
      activeChat,
      messages,
      rooms,
      onlineUsers,
      users,
      typingUsers,
      isLoading,
      setActiveChat,
      sendMessage,
      createRoom,
      updateRoom,
      joinRoom,
      leaveRoom,
      setTyping,
    }}>
      {children}
    </ChatContext.Provider>
  );
};
