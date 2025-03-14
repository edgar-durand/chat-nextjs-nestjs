import { useState, useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';

interface RoomMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

export default function RoomMembersModal({ isOpen, onClose, roomId }: RoomMembersModalProps) {
  const { rooms, users, joinRoom, leaveRoom } = useChat();
  const { user } = useAuth();
  const room = rooms.find(r => r._id === roomId);
  
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedUsers([]);
      setSearchTerm('');
      setIsAdding(false);
      setIsRemoving(false);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen || !room) return null;

  // Check if current user is the creator
  const isCreator = user && room.creator && room.creator._id === user.id;

  // Get non-member users for adding
  const nonMemberUsers = users.filter(
    u => !room.members.some(m => m._id === u._id) && u._id !== user?.id
  );

  // Filter users by search term
  const filteredNonMembers = searchTerm 
    ? nonMemberUsers.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : nonMemberUsers;

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;
    
    setError('');
    setIsAdding(true);
    
    try {
      // Add each selected user to the room
      for (const userId of selectedUsers) {
        if (userId) { // Ensure userId is defined
          await joinRoom(roomId, userId);
        }
      }
      
      // Clear selection after successful addition
      setSelectedUsers([]);
    } catch (err) {
      console.error('Error adding members:', err);
      setError('Failed to add members. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (userId: string | undefined) => {
    if (!userId) return; // Skip if userId is undefined
    
    setError('');
    setIsRemoving(true);
    
    try {
      await leaveRoom(roomId, userId);
    } catch (err) {
      console.error('Error removing member:', err);
      setError('Failed to remove member. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  };

  const toggleUserSelection = (userId: string | undefined) => {
    if (!userId) return; // Skip if userId is undefined
    
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Room Members</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 m-4 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="p-4 border-b">
          <h4 className="font-medium text-gray-700 mb-2">Current Members ({room.members.length})</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {room.members.map(member => (
              <div key={member._id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {member.avatar ? (
                      <Image
                        src={member.avatar}
                        alt={member.name}
                        width={32}
                        height={32}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-700">{member.name.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </div>
                </div>
                
                {isCreator && member._id && room.creator._id && member._id !== room.creator._id && member._id !== user?.id && (
                  <button
                    disabled={isRemoving}
                    onClick={() => handleRemoveMember(member._id)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    {isRemoving ? 'Removing...' : 'Remove'}
                  </button>
                )}
                
                {member._id && room.creator._id && member._id === room.creator._id && (
                  <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded-full">Creator</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {isCreator && (
          <div className="p-4">
            <h4 className="font-medium text-gray-700 mb-2">Add Members</h4>
            <div className="mb-3">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {filteredNonMembers.length === 0 ? (
                <p className="text-sm text-gray-500 p-2">No users found</p>
              ) : (
                filteredNonMembers.map(user => (
                  <div 
                    key={user._id} 
                    className={`flex items-center justify-between p-2 hover:bg-gray-50 rounded-md cursor-pointer ${
                      user._id && selectedUsers.includes(user._id) ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => toggleUserSelection(user._id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {user.avatar ? (
                          <Image
                            src={user.avatar}
                            alt={user.name}
                            width={32}
                            height={32}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-700">{user.name.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={user._id ? selectedUsers.includes(user._id) : false}
                        onChange={() => {}} // Handled by div click
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="flex justify-end">
              <button
                disabled={selectedUsers.length === 0 || isAdding}
                onClick={handleAddMembers}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isAdding ? 'Adding...' : `Add Selected (${selectedUsers.length})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
