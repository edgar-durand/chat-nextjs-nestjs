import { useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import ProfileModal from '../profile/ProfileModal';

interface ChatSidebarProps {
  onCreateRoom: () => void;
}

interface ActiveChat {
  id: string;
  type: 'private' | 'room';
}

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

export default function ChatSidebar({ onCreateRoom }: ChatSidebarProps) {
  const { user, logout } = useAuth();
  const { 
    rooms, 
    users, 
    onlineUsers, 
    activeChat, 
    setActiveChat,
    isLoading
  } = useChat();

  const [activeTab, setActiveTab] = useState<'chats' | 'rooms'>('chats');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const handleImageError = (id: string) => {
    setFailedImages(prev => ({
      ...prev,
      [id]: true
    }));
  };

  if (isLoading) {
    return (
      <div className="w-64 flex-shrink-0 bg-gray-800 text-white p-4 flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 flex-shrink-0 bg-gray-800 text-white flex flex-col h-full">
      {/* User profile section */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3 relative">
          <div className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
            {user?.avatar && isValidImageSrc(user.avatar) && !failedImages[user?.id || ''] ? (
              <Image
                src={user.avatar}
                alt={user?.name || 'User avatar'}
                width={40}
                height={40}
                className="h-full w-full object-cover"
                priority={false}
                onError={() => handleImageError(user?.id || '')}
              />
            ) : (
              <span className="text-lg font-medium">{user?.name ? getInitials(user.name) : ''}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white truncate">{user?.name}</h3>
            <span className="text-xs text-gray-400">Online</span>
          </div>
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="text-white p-1 rounded-full hover:bg-gray-700 transition"
            title="Profile settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {/* Profile menu dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 top-10 mt-1 w-48 bg-gray-700 rounded-md shadow-lg z-10">
              <ul className="py-1">
                <li>
                  <button 
                    onClick={() => {
                      setIsProfileModalOpen(true);
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-600"
                  >
                    Profile Settings
                  </button>
                </li>
                <li>
                  <button 
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-600"
                  >
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
      
      {/* Tabs navigation */}
      <div className="flex border-b border-gray-700">
        <button 
          className={`flex-1 py-3 text-center text-sm font-medium ${activeTab === 'chats' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}
          onClick={() => setActiveTab('chats')}
        >
          Direct Messages
        </button>
        <button 
          className={`flex-1 py-3 text-center text-sm font-medium ${activeTab === 'rooms' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}
          onClick={() => setActiveTab('rooms')}
        >
          Rooms
        </button>
      </div>
      
      {/* Chat/Room list */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'chats' ? (
          <div className="p-2">
            <h3 className="text-xs uppercase text-gray-500 font-semibold px-2 py-1">Direct Messages</h3>
            <div className="space-y-1">
              {users
                .filter(u => u._id !== user?.id) // Don't show the current user
                .map(otherUser => {
                  const isActive = activeChat?.id === otherUser._id && activeChat?.type === 'private';
                  const isOnline = onlineUsers && otherUser._id ? onlineUsers[otherUser._id] : false;
                  
                  return (
                    <button
                      key={otherUser._id}
                      className={`w-full text-left flex items-center rounded-md p-2 ${isActive ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
                      onClick={() => setActiveChat({ id: otherUser._id || '', type: 'private' })}
                    >
                      <div className="relative">
                        <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
                          {otherUser.avatar && isValidImageSrc(otherUser.avatar) && !failedImages[otherUser._id || ''] ? (
                            <Image
                              src={otherUser.avatar}
                              alt={otherUser.name}
                              width={32}
                              height={32}
                              className="h-full w-full object-cover"
                              priority={false}
                              onError={() => otherUser._id && handleImageError(otherUser._id || '')}
                            />
                          ) : (
                            <span className="text-sm font-medium">{getInitials(otherUser.name)}</span>
                          )}
                        </div>
                        {isOnline && (
                          <div className="absolute bottom-0 right-0 bg-green-500 h-2 w-2 rounded-full"></div>
                        )}
                      </div>
                      <div className="ml-2 flex-1 min-w-0">
                        <div className="flex justify-between">
                          <h4 className="text-sm font-medium truncate">{otherUser.name}</h4>
                        </div>
                        <p className="text-xs text-gray-400 truncate">
                          {isOnline ? 'Online' : 'Offline'}
                        </p>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        ) : (
          <div className="p-2">
            <div className="flex items-center justify-between px-2 py-1">
              <h3 className="text-xs uppercase text-gray-500 font-semibold">Rooms</h3>
              <button 
                onClick={onCreateRoom}
                className="bg-blue-600 hover:bg-blue-700 rounded-full p-1 text-white transition"
                title="Create a new room"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="space-y-1">
              {rooms.map(room => {
                const isActive = activeChat?.id === room._id && activeChat?.type === 'room';
                
                return (
                  <button
                    key={room._id}
                    className={`w-full text-left flex items-center rounded-md p-2 ${isActive ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
                    onClick={() => setActiveChat({ id: room._id, type: 'room' })}
                  >
                    <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
                      {room.image && isValidImageSrc(room.image) && !failedImages[room._id || ''] ? (
                        <Image
                          src={room.image}
                          alt={room.name}
                          width={32}
                          height={32}
                          className="h-full w-full object-cover"
                          priority={false}
                          onError={() => room._id && handleImageError(room._id || '')}
                        />
                      ) : (
                        <span className="text-sm font-medium">{getInitials(room.name)}</span>
                      )}
                    </div>
                    <div className="ml-2 flex-1 min-w-0">
                      <div className="flex justify-between">
                        <h4 className="text-sm font-medium truncate">{room.name}</h4>
                      </div>
                      <p className="text-xs text-gray-400 truncate">
                        {room.isPrivate ? 'Private' : 'Public'} · {room.members?.length || 0} members
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* Profile modal */}
      {isProfileModalOpen && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}
    </div>
  );
}
