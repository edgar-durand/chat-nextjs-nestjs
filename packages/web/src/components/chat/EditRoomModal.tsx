import { useState, useEffect, useRef } from 'react';
import { useChat } from '@/contexts/ChatContext';
import Image from 'next/image';

interface EditRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

export default function EditRoomModal({ isOpen, onClose, roomId }: EditRoomModalProps) {
  const { rooms, updateRoom } = useChat();
  const room = rooms.find(r => r._id === roomId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [localImagePreview, setLocalImagePreview] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (room) {
      setName(room.name || '');
      setDescription(room.description || '');
      setImage(room.image || '');
      setIsPrivate(room.isPrivate || false);
      setLocalImagePreview(null);
      setShowUrlInput(false);
    }
  }, [room]);

  if (!isOpen || !room) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      setIsSubmitting(true);
      // Use localImagePreview if available, otherwise use image URL
      const imageToUse = localImagePreview || image;
      
      await updateRoom(roomId, {
        name,
        description,
        image: imageToUse,
        isPrivate
      });
      onClose();
    } catch (err) {
      console.error('Error updating room:', err);
      setError('Failed to update room. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('File must be an image');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setLocalImagePreview(event.target.result as string);
        setImage(''); // Clear URL input when local file is selected
        setShowUrlInput(false); // Hide URL input when file is selected
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setLocalImagePreview(null);
    setImage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setShowUrlInput(false);
  };

  const toggleUrlInput = () => {
    setShowUrlInput(!showUrlInput);
    if (showUrlInput && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b">
          <h3 className="text-lg font-medium text-gray-900">Edit Room</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Room Name *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room Image
            </label>
            
            {/* Image preview with camera controls */}
            <div className="flex items-center justify-center mb-3">
              <div className="relative">
                {/* Room image preview */}
                <div className="relative w-52 h-32 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                  {localImagePreview || image ? (
                    <Image
                      src={localImagePreview || image}
                      alt={name}
                      layout="fill"
                      objectFit="cover"
                    />
                  ) : (
                    <div className="text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                
                {/* Camera controls */}
                <div className="absolute -bottom-2 right-0 flex space-x-1">
                  {/* Hidden file input */}
                  <input
                    type="file"
                    id="room-image-upload"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  
                  {/* Upload button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors"
                    title="Upload image from device"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* URL button */}
                  <button
                    type="button"
                    onClick={toggleUrlInput}
                    className="bg-gray-200 text-gray-700 p-2 rounded-full hover:bg-gray-300 transition-colors"
                    title="Enter image URL"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* Remove button */}
                  {(localImagePreview || image) && (
                    <button 
                      type="button"
                      onClick={handleRemoveImage}
                      className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                      title="Remove image"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* URL Input (toggleable) */}
            {showUrlInput && (
              <div className="mb-3">
                <label htmlFor="image" className="block text-xs font-medium text-gray-700 mb-1">
                  Enter image URL
                </label>
                <input
                  type="url"
                  id="image"
                  value={image}
                  onChange={(e) => {
                    setImage(e.target.value);
                    if (e.target.value) {
                      setLocalImagePreview(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/room-image.jpg"
                />
              </div>
            )}
            
            <p className="text-xs text-center text-gray-500">
              For best results, use a rectangular or square image. Max size: 5MB.
            </p>
          </div>

          <div className="flex items-center mt-2">
            <input
              type="checkbox"
              id="is-private"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is-private" className="ml-2 block text-sm text-gray-700">
              Private Room (Only invited members can join)
            </label>
          </div>

          <div className="flex justify-end mt-5 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 mr-3 text-gray-700 border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
              }`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
