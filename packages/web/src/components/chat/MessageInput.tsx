import { useState, useEffect, useCallback, useRef } from 'react';
import { useChat, FileType, FileAttachment } from '@/contexts/ChatContext';

export default function MessageInput() {
  const { sendMessage, activeChat, startTyping, stopTyping, uploadingFiles } = useChat();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
    
    if (isTyping) {
      startTyping();
    } else {
      stopTyping();
    }
    
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
        typingTimeoutRef.current = null;
      }, 2000); // Stop typing indicator after 2 seconds of inactivity
    }
  }, [startTyping, stopTyping]);

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
    if ((!message.trim() && selectedFiles.length === 0) || !activeChat || isSubmitting) return;

    try {
      setIsSubmitting(true);
      handleTypingIndicator(false);
      
      // Si hay archivos seleccionados, enviar solo el primero por ahora
      const selectedFile = selectedFiles.length > 0 ? selectedFiles[0] : null;
      await sendMessage(message.trim(), selectedFile);
      
      setMessage('');
      setSelectedFiles([]);
      setPreviewUrls([]);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Reducir el tamaño máximo a 15MB para evitar el límite de BSON de MongoDB (16MB)
    const maxSize = 15 * 1024 * 1024; // 15MB máximo para evitar límites de MongoDB
    let newFiles: File[] = [];
    let newPreviewUrls: string[] = [];
    let processedCount = 0;
    const totalFiles = Array.from(files).length;
    
    // Procesar cada archivo seleccionado
    Array.from(files).forEach(async (file) => {
      try {
        // Verificar tamaño
        if (file.size > maxSize) {
          alert(`El archivo ${file.name} excede el límite de 15MB. Los archivos deben ser menores a 15MB debido a limitaciones de la base de datos.`);
          processedCount++;
          return;
        }
        
        // Crear URL para vista previa
        const previewUrl = URL.createObjectURL(file);
        newPreviewUrls.push(previewUrl);
        
        newFiles.push(file);

        // Actualizar arrays temporales
        processedCount++;
        
        // Actualizar estado solo cuando todos los archivos han sido procesados
        if (processedCount === totalFiles) {
          setSelectedFiles(prev => [...prev, ...newFiles]);
          setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
        }
      } catch (error) {
        console.error('Error processing file:', error);
        processedCount++;
      }
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Reset message input only when actually changing chats
  useEffect(() => {
    // Only reset if the active chat ID actually changed
    if (activeChatId !== prevActiveChatId) {
      setMessage('');
      setSelectedFiles([]);
      setPreviewUrls([]);
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

      // Cleanup URLs
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  if (!activeChat) return null;

  return (
    <div className="flex flex-col p-4 border-t border-gray-200">
      {/* File previews */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedFiles.map((file, index) => (
            <div key={index} className="relative group">
              <div className="h-20 w-20 flex items-center justify-center bg-gray-100 rounded border border-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <button 
                onClick={() => removeFile(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                &times;
              </button>
              <span className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs truncate px-1">
                {file.name.length > 10 ? `${file.name.substring(0, 10)}...` : file.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Uploading files progress */}
      {Object.entries(uploadingFiles).length > 0 && (
        <div className="flex flex-col gap-2 mb-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            <h4 className="text-sm font-medium text-gray-700">Archivos en proceso</h4>
          </div>
          {Object.entries(uploadingFiles).filter(([_, { progress }]) => progress < 100).map(([id, { progress, error }]) => (
            <div key={id} className="flex flex-col">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500">
                  {error ? 'Error al procesar' : progress === 100 ? 'Completado' : 'Procesando...'}
                </span>
                <span className="text-xs font-medium text-gray-700">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${error ? 'bg-red-500' : 'bg-primary-500'}`}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              {error && (
                <div className="mt-1 flex flex-col">
                  <p className="text-xs text-red-500">{error}</p>
                  <button 
                    className="self-start text-xs text-primary-500 hover:text-primary-600 mt-1"
                    onClick={() => {
                      const matchingFile = selectedFiles.find(f => f.name === id);
                      if (matchingFile) {
                        // Reintentar enviando este archivo
                        sendMessage('', matchingFile);
                      }
                    }}
                  >
                    Reintentar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Message input and actions */}
      <div className="flex items-center">
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="mr-2 text-gray-500 hover:text-primary-500 focus:outline-none"
          title="Attach file"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        />
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
            disabled={(message.trim().length === 0 && selectedFiles.length === 0) || isSubmitting}
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
    </div>
  );
}
