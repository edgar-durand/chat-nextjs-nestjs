import { useEffect, useRef } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { format } from 'date-fns';

export default function MessageList() {
  const { user } = useAuth();
  const { messages, isLoading, typingUsers } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
        <p className="mt-2 text-gray-500">Loading messages...</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col h-full justify-center items-center p-4">
        <div className="bg-gray-100 p-3 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="mt-4 text-gray-500 text-center">
          No messages yet. Send a message to start the conversation!
        </p>
      </div>
    );
  }

  // Group messages by date
  const messagesByDate = messages.reduce((groups, message) => {
    const date = new Date(message.createdAt).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, typeof messages>);

  // Get array of typing users (excluding current user)
  const typingUsersList = Object.entries(typingUsers)
    .filter(([userId, isTyping]) => isTyping && userId !== user?.id)
    .map(([userId]) => userId);

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
      {Object.entries(messagesByDate).map(([date, dateMessages]) => (
        <div key={date} className="space-y-4">
          <div className="flex justify-center">
            <div className="bg-gray-100 px-3 py-1 rounded-full">
              <span className="text-xs text-gray-500">
                {format(new Date(date), 'MMMM d, yyyy')}
              </span>
            </div>
          </div>

          {dateMessages.map((message) => {
            const isOwnMessage = message.sender._id === user?.id;

            return (
              <div
                key={message._id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex max-w-xs md:max-w-md lg:max-w-lg ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                  {!isOwnMessage && (
                    <div className="flex-shrink-0 mr-3">
                      <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                        {message.sender.avatar ? (
                          <Image
                            src={message.sender.avatar}
                            alt={message.sender.name}
                            width={32}
                            height={32}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-700">
                            {message.sender.name.charAt(0)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className={`
                    ${isOwnMessage 
                      ? 'bg-primary-500 text-white rounded-tl-lg rounded-tr-none' 
                      : 'bg-gray-200 text-gray-800 rounded-tr-lg rounded-tl-none'} 
                    rounded-bl-lg rounded-br-lg px-4 py-2 shadow-sm
                  `}>
                    {!isOwnMessage && (
                      <p className="text-xs font-medium mb-1">
                        {message.sender.name}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs ${isOwnMessage ? 'text-primary-200' : 'text-gray-500'} text-right mt-1`}>
                      {format(new Date(message.createdAt), 'h:mm a')}
                      {isOwnMessage && message.isRead && (
                        <span className="ml-1">
                          ✓
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Typing indicator */}
      {typingUsersList.length > 0 && (
        <div className="flex items-center space-x-2 mt-2">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">
                {typingUsersList.length === 1 
                  ? messages.find(m => m.sender._id === typingUsersList[0])?.sender.name?.charAt(0) || '?'
                  : '+'
                }
              </span>
            </div>
          </div>
          <div className="bg-gray-200 rounded-lg px-4 py-2">
            <div className="flex space-x-1">
              <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '250ms' }}></div>
              <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '500ms' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* This div is used for auto-scrolling to the bottom */}
      <div ref={messagesEndRef} />
    </div>
  );
}
