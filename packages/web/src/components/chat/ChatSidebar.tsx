import { useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import Image from 'next/image';

interface ChatSidebarProps {
  onCreateRoom: () => void;
}

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
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
            {user?.avatar ? (
              <Image
                src={user.avatar}
                alt={user?.name || 'User avatar'}
                width={40}
                height={40}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-lg font-medium">{user?.name?.charAt(0)}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-medium truncate">{user?.name}</h2>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="text-gray-400 hover:text-white"
            title="Sign out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm9 3a1 1 0 00-1.707.707L12.586 9H7a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 00-.707-.293z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          className={`flex-1 py-3 text-sm font-medium text-center ${
            activeTab === 'chats' ? 'text-white border-b-2 border-primary-500' : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('chats')}
        >
          Direct Messages
        </button>
        <button
          className={`flex-1 py-3 text-sm font-medium text-center ${
            activeTab === 'rooms' ? 'text-white border-b-2 border-primary-500' : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('rooms')}
        >
          Rooms
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-700">
        <div className="relative rounded-md shadow-sm">
          <input
            type="text"
            className="block w-full bg-gray-700 border-transparent rounded-md py-2 pl-3 pr-10 text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-transparent"
            placeholder={activeTab === 'chats' ? "Search users..." : "Search rooms..."}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* List of chats/rooms */}
      <div className="flex-1 overflow-y-auto scrollbar">
        {activeTab === 'chats' ? (
          <div className="py-2">
            <div className="px-4 py-2 flex justify-between items-center">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Direct Messages
              </h3>
            </div>
            <div className="mt-1">
              {users
                ?.filter(u => u._id !== user?.id)
                .map(u => (
                  <button
                    key={u._id}
                    onClick={() => setActiveChat({ type: 'private', id: u._id })}
                    className={`w-full text-left px-4 py-2 flex items-center space-x-3 hover:bg-gray-700 ${
                      activeChat?.type === 'private' && activeChat.id === u._id 
                        ? 'bg-gray-700' 
                        : ''
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="h-9 w-9 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
                        {u.avatar ? (
                          <Image
                            src={u.avatar}
                            alt={u.name}
                            width={36}
                            height={36}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium">{u.name.charAt(0)}</span>
                        )}
                      </div>
                      {onlineUsers[u._id] && (
                        <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-1 ring-gray-800"></span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{u.name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {onlineUsers[u._id] 
                          ? 'Online' 
                          : u.lastActive 
                            ? `Last seen ${format(new Date(u.lastActive), 'MMM d, h:mm a')}` 
                            : 'Offline'
                        }
                      </p>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        ) : (
          <div className="py-2">
            <div className="px-4 py-2 flex justify-between items-center">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Rooms
              </h3>
              <button
                onClick={onCreateRoom}
                className="text-gray-400 hover:text-white"
                title="Create new room"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="mt-1">
              {rooms.map(room => (
                <button
                  key={room._id}
                  onClick={() => setActiveChat({ type: 'room', id: room._id })}
                  className={`w-full text-left px-4 py-2 flex items-center space-x-3 hover:bg-gray-700 ${
                    activeChat?.type === 'room' && activeChat.id === room._id 
                      ? 'bg-gray-700' 
                      : ''
                  }`}
                >
                  <div className="flex-shrink-0">
                    <div className="h-9 w-9 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
                      {room.image ? (
                        <Image
                          src={room.image}
                          alt={room.name}
                          width={36}
                          height={36}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-medium">{room.name.charAt(0)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {room.name}
                      {room.isPrivate && (
                        <span className="ml-1 text-xs text-gray-400">
                          (Private)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {room.members.length} members
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
