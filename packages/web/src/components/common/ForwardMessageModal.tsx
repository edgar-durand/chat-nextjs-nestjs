import React, { useState, useEffect } from 'react';
import { formatDistance } from 'date-fns';
import { es } from 'date-fns/locale';
import { useChat } from '../../contexts/ChatContext';
import { Room, User } from '../../types';

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: string;
  messageContent: string;
  messageSender: {
    _id: string;
    name: string;
    avatar?: string;
  };
  messageDate: string;
}

interface ForwardTarget {
  id: string;
  name: string;
  imageUrl?: string;
  type: 'private' | 'room';
}

const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({
  isOpen,
  onClose,
  messageId,
  messageContent,
  messageSender,
  messageDate
}) => {
  const { rooms, users, forwardMessage } = useChat();
  const [selectedTarget, setSelectedTarget] = useState<{type: 'private' | 'room', id: string} | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Combine rooms and users for the forward list
  const combinedTargets: ForwardTarget[] = [
    ...rooms.map((room: Room) => ({ 
      id: room._id, 
      name: room.name, 
      imageUrl: room.imageUrl, 
      type: 'room' as const 
    })),
    ...users.map((user: User) => ({ 
      id: user._id, 
      name: user.name, 
      imageUrl: user.avatar, 
      type: 'private' as const 
    }))
  ];
  
  // Filter targets based on search term
  const filteredTargets = searchTerm 
    ? combinedTargets.filter(target => 
        target.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : combinedTargets;
  
  const handleForward = async () => {
    if (!selectedTarget) return;
    
    try {
      await forwardMessage(messageId, selectedTarget.type, selectedTarget.id);
      onClose();
    } catch (error) {
      console.error('Error al reenviar mensaje:', error);
    }
  };
  
  // Reset selected target when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedTarget(null);
      setSearchTerm('');
    }
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 transform transition-all duration-300 scale-100">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-semibold text-gray-900">Reenviar mensaje</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Preview del mensaje a reenviar */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">
              {messageSender.avatar ? (
                <img src={messageSender.avatar} alt={messageSender.name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                messageSender.name.charAt(0)
              )}
            </div>
            <div className="ml-2">
              <div className="text-sm font-medium text-gray-900">{messageSender.name}</div>
              <div className="text-xs text-gray-500">
                {formatDistance(new Date(messageDate), new Date(), { addSuffix: true, locale: es })}
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-700">{messageContent}</p>
        </div>
        
        {/* Buscador */}
        <div className="mb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Buscar chats y salas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {/* Lista de chats/salas para reenviar */}
        <div className="max-h-60 overflow-y-auto mb-4">
          {filteredTargets.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {filteredTargets.map((target) => (
                <li key={`${target.type}-${target.id}`}>
                  <button
                    onClick={() => setSelectedTarget({ type: target.type, id: target.id })}
                    className={`w-full flex items-center px-3 py-2 hover:bg-gray-50 transition-colors ${
                      selectedTarget?.id === target.id ? 'bg-primary-50' : ''
                    }`}
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold overflow-hidden">
                      {target.imageUrl ? (
                        <img src={target.imageUrl} alt={target.name} className="w-10 h-10 object-cover" />
                      ) : (
                        target.name.charAt(0)
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {target.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {target.type === 'room' ? 'Sala' : 'Chat privado'}
                      </p>
                    </div>
                    {selectedTarget?.id === target.id && (
                      <div className="ml-auto">
                        <svg className="w-5 h-5 text-primary-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-4 text-center text-gray-500">
              No se encontraron resultados
            </div>
          )}
        </div>
        
        {/* Botones de acción */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Cancelar
          </button>
          <button
            onClick={handleForward}
            disabled={!selectedTarget}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium text-white ${
              selectedTarget 
                ? 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500' 
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            Reenviar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForwardMessageModal;
