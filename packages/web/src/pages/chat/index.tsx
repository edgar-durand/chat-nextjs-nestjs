import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatHeader from '@/components/chat/ChatHeader';
import MessageList from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';
import CreateRoomModal from '@/components/chat/CreateRoomModal';
import { useState } from 'react';

export default function ChatPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { activeChat, isLoading: chatLoading } = useChat();
  const router = useRouter();
  const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <ChatSidebar 
        onCreateRoom={() => setIsCreateRoomModalOpen(true)} 
      />

      {/* Main chat area */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        {activeChat ? (
          <>
            <ChatHeader />
            
            <div className="flex-1 overflow-hidden bg-white shadow-md">
              <MessageList />
            </div>
            
            <div className="p-4 bg-white border-t">
              <MessageInput />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center p-8 max-w-md">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Welcome to the Chat App!</h3>
              <p className="text-gray-600 mb-6">
                Select a conversation from the sidebar or start a new chat to begin messaging.
              </p>
              <button
                onClick={() => setIsCreateRoomModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                Create New Room
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      <CreateRoomModal 
        isOpen={isCreateRoomModalOpen}
        onClose={() => setIsCreateRoomModalOpen(false)}
      />
    </div>
  );
}
