import React, { useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import EditRoomModal from './EditRoomModal';
import RoomMembersModal from './RoomMembersModal';

/**
 * Helper function to get initials from a name
 * Returns up to 2 initials (first and last name or first two words)
 */
const getInitials = (name: string): string => {
  if (!name) return '';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    // Get first letter of first and last name
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  } else {
    // Get first two letters of single name
    return name.substring(0, Math.min(2, name.length)).toUpperCase();
  }
};

/**
 * Validates if a string is a valid image URL or base64 image data
 */
const isValidImageSrc = (src: string | undefined): boolean => {
  if (!src) return false;
  
  // Check if it's a valid URL or base64 data
  return (
    src.startsWith('http://') || 
    src.startsWith('https://') || 
    src.startsWith('data:image/')
  );
};

export default function ChatHeader() {
  const { activeChat, users, rooms, onlineUsers } = useChat();
  const { user } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const handleImageError = (id: string) => {
    setFailedImages(prev => ({
      ...prev,
      [id]: true
    }));
  };

  if (!activeChat) return null;

  // Get chat room from the list of rooms
  const room = rooms.find(r => r._id === activeChat.id);
  
  // Is this a group chat?
  const isGroupChat = activeChat.type === 'room';
  
  // For private chats, get the recipient (the other user)
  const recipient = !isGroupChat ? users.find(u => u._id === activeChat.id) : null;
  
  // For group chats, display the room information
  if (isGroupChat && room) {
    return (
      <>
        <div className="flex justify-between items-center p-3 border-b">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden mr-3">
              {room.image && isValidImageSrc(room.image) && !failedImages[room._id || ''] ? (
                <Image 
                  src={room.image}
                  alt={room.name}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                  priority={false}
                  onError={() => room._id && handleImageError(room._id || '')}
                />
              ) : (
                <span className="text-xl font-semibold">{getInitials(room.name)}</span>
              )}
            </div>
            <div>
              <h3 className="font-semibold">{room.name}</h3>
              <p className="text-sm text-gray-500">
                {room.members?.length} members
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Miembros del chat */}
            <button 
              className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
              title="View members"
              onClick={() => setIsMembersModalOpen(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
            </button>
            
            {/* Editar chat (solo para el creador) */}
            {room.creator && user && room.creator._id === user.id && (
              <button 
                className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                title="Edit room"
                onClick={() => setIsEditModalOpen(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>
        
        {/* Modales para chat grupal */}
        {isEditModalOpen && (
          <EditRoomModal 
            isOpen={isEditModalOpen} 
            onClose={() => setIsEditModalOpen(false)} 
            roomId={activeChat.id} 
          />
        )}
        
        {isMembersModalOpen && (
          <RoomMembersModal
            isOpen={isMembersModalOpen}
            onClose={() => setIsMembersModalOpen(false)}
            roomId={activeChat.id}
          />
        )}
      </>
    );
  }
  
  // For private chats, display the user information
  if (recipient) {
    return (
      <>
        <div className="flex justify-between items-center p-3 border-b">
          <div className="flex items-center">
            <div className="relative mr-3">
              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-xl font-semibold overflow-hidden">
                {recipient.avatar && isValidImageSrc(recipient.avatar) && !failedImages[recipient._id || ''] ? (
                  <Image
                    src={recipient.avatar}
                    alt={recipient.name}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                    onError={() => recipient._id && handleImageError(recipient._id || '')}
                  />
                ) : (
                  <span>{getInitials(recipient.name)}</span>
                )}
              </div>
              {onlineUsers && recipient._id && onlineUsers[recipient._id] && (
                <div className="absolute bottom-0 right-0 bg-green-500 h-2.5 w-2.5 rounded-full border border-white"></div>
              )}
            </div>
            <div>
              <h3 className="font-semibold">{recipient.name}</h3>
              <p className="text-xs text-gray-500">
                {onlineUsers && recipient._id && onlineUsers[recipient._id] ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return null;
}
