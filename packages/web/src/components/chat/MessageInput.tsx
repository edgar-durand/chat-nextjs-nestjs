import { useState, useEffect, useCallback, useRef } from 'react';
import { useChat } from '@/contexts/ChatContext';

export default function MessageInput() {
  const { sendMessage, activeChat, setTyping } = useChat();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Keep track of the previous active chat to prevent unnecessary resets
  const prevActiveChatRef = useRef(activeChat);
  
  // Store activeChat ID for comparisons
  const activeChatId = activeChat ? `${activeChat.type}-${activeChat.id}` : null;
  const prevActiveChatId = prevActiveChatRef.current 
    ? `${prevActiveChatRef.current.type}-${prevActiveChatRef.current.id}` 
    : null;

  // Handle typing indicator with debounce
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleTypingIndicator = useCallback((isTyping: boolean) => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    
    setTyping(isTyping);
    
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
        typingTimeoutRef.current = null;
      }, 2000); // Stop typing indicator after 2 seconds of inactivity
    }
  }, [setTyping]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setMessage(newValue);
    
    if (newValue.length > 0) {
      handleTypingIndicator(true);
    } else {
      handleTypingIndicator(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Send message on Enter key (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!message.trim() || !activeChat || isSubmitting) return;

    try {
      setIsSubmitting(true);
      handleTypingIndicator(false);
      await sendMessage(message.trim());
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset message input only when actually changing chats
  useEffect(() => {
    // Only reset if the active chat ID actually changed
    if (activeChatId !== prevActiveChatId) {
      setMessage('');
      handleTypingIndicator(false);
      prevActiveChatRef.current = activeChat;
    }
  }, [activeChatId, prevActiveChatId, activeChat, handleTypingIndicator]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  if (!activeChat) return null;

  return (
    <div className="flex items-center p-4 border-t border-gray-200">
      <div className="flex-1 mr-2">
        <input
          type="text"
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-full h-10 px-4 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder="Type a message..."
        />
      </div>
      <div>
        <button
          onClick={handleSubmit}
          disabled={!message.trim() || isSubmitting}
          className="h-10 w-10 rounded-full bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
