import { useChat } from '@/contexts/ChatContext';
import Image from 'next/image';

export default function ChatHeader() {
  const { activeChat, users, rooms, onlineUsers } = useChat();

  if (!activeChat) return null;

  // For direct messages, find the other user
  if (activeChat.type === 'private') {
    const recipientUser = users.find(u => u._id === activeChat.id);
    
    if (!recipientUser) return null;
    
    return (
      <div className="bg-white border-b shadow-sm px-4 py-3 flex items-center">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {recipientUser.avatar ? (
                <Image
                  src={recipientUser.avatar}
                  alt={recipientUser.name}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-lg font-medium text-gray-700">{recipientUser.name.charAt(0)}</span>
              )}
            </div>
            {onlineUsers[recipientUser._id] && (
              <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-400 ring-1 ring-white"></span>
            )}
          </div>
          <div>
            <h2 className="text-lg font-medium text-gray-800">{recipientUser.name}</h2>
            <p className="text-sm text-gray-500">
              {onlineUsers[recipientUser._id] ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // For room chats
  const room = rooms.find(r => r._id === activeChat.id);
  
  if (!room) return null;
  
  return (
    <div className="bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
          {room.image ? (
            <Image
              src={room.image}
              alt={room.name}
              width={40}
              height={40}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-lg font-medium text-gray-700">{room.name.charAt(0)}</span>
          )}
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-medium text-gray-800">{room.name}</h2>
            {room.isPrivate && (
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                Private
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {room.members.length} members
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <button 
          className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
          title="Room information"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </button>
        <button 
          className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
          title="Room settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
