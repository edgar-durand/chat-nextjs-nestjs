import { useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useForm } from 'react-hook-form';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CreateRoomFormData {
  name: string;
  description: string;
  isPrivate: boolean;
  selectedUsers: string[];
}

export default function CreateRoomModal({ isOpen, onClose }: CreateRoomModalProps) {
  const { createRoom, users, setActiveChat } = useChat();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    register, 
    handleSubmit, 
    reset,
    watch,
    formState: { errors } 
  } = useForm<CreateRoomFormData>({
    defaultValues: {
      name: '',
      description: '',
      isPrivate: false,
      selectedUsers: []
    }
  });
  
  const isPrivate = watch('isPrivate');

  const onSubmit = async (data: CreateRoomFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      const newRoom = await createRoom(
        data.name,
        data.description,
        data.isPrivate,
        data.selectedUsers
      );
      
      // Set the newly created room as active chat
      setActiveChat({ type: 'room', id: newRoom._id });
      
      // Close modal and reset form
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create room. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleClose = () => {
    reset();
    setError(null);
    onClose();
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleClose}
        ></div>

        {/* Modal */}
        <div className="inline-block w-full max-w-md px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <span className="sr-only">Close</span>
              <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Create a New Room
              </h3>
              
              {error && (
                <div className="mt-2 p-2 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Room Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    {...register('name', { required: 'Room name is required' })}
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    {...register('description')}
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="Describe what this room is about..."
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPrivate"
                    {...register('isPrivate')}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPrivate" className="ml-2 block text-sm text-gray-700">
                    Private Room (invite only)
                  </label>
                </div>
                
                {isPrivate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Invite Users
                    </label>
                    <div className="mt-1 max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2">
                      {users.map(user => (
                        <div key={user._id} className="flex items-center py-1">
                          <input
                            type="checkbox"
                            id={`user-${user._id}`}
                            value={user._id}
                            {...register('selectedUsers')}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`user-${user._id}`} className="ml-2 block text-sm text-gray-700">
                            {user.name} ({user.email})
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Room'}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="inline-flex justify-center w-full px-4 py-2 mt-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
