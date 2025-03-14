import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, updateProfile } = useAuth();
  
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('general'); // 'general' or 'security'
  const [localImagePreview, setLocalImagePreview] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setAvatar(user.avatar);
    }
    
    // Reset form state when modal opens/closes
    if (isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccessMessage('');
      setLocalImagePreview(null);
      setShowUrlInput(false);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleGeneralUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    
    try {
      setIsLoading(true);
      
      // Use localImagePreview if available, otherwise use avatar URL
      const avatarToUse = localImagePreview || avatar;
      
      await updateProfile({
        name,
        avatar: avatarToUse,
      });
      
      setSuccessMessage('Profile updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    try {
      setIsLoading(true);
      
      await updateProfile({
        currentPassword,
        newPassword,
      });
      
      // Reset password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      setSuccessMessage('Password updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
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
        setAvatar(''); // Clear URL input when local file is selected
        setShowUrlInput(false); // Hide URL input when file is selected
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setLocalImagePreview(null);
    setAvatar('');
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
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Profile Settings</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex border-b">
          <button
            className={`flex-1 p-3 text-center ${activeTab === 'general' ? 'text-blue-600 border-b-2 border-blue-600 font-medium' : 'text-gray-500'}`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button
            className={`flex-1 p-3 text-center ${activeTab === 'security' ? 'text-blue-600 border-b-2 border-blue-600 font-medium' : 'text-gray-500'}`}
            onClick={() => setActiveTab('security')}
          >
            Security
          </button>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 m-4 rounded-md text-sm">
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-50 text-green-600 p-3 m-4 rounded-md text-sm">
            {successMessage}
          </div>
        )}
        
        {/* General Tab */}
        {activeTab === 'general' && (
          <form onSubmit={handleGeneralUpdate} className="p-4">
            <div className="flex flex-col items-center mb-6">
              <div className="relative h-24 w-24 mb-4">
                {/* Avatar Circle with Image */}
                <div className="relative h-24 w-24 rounded-full overflow-hidden bg-gray-200">
                  {localImagePreview ? (
                    <Image
                      src={localImagePreview}
                      alt={name}
                      layout="fill"
                      objectFit="cover"
                    />
                  ) : avatar ? (
                    <Image
                      src={avatar}
                      alt={name}
                      layout="fill"
                      objectFit="cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <span className="text-2xl font-medium text-gray-700">{name.charAt(0)}</span>
                    </div>
                  )}
                </div>
                
                {/* Camera Icon Button */}
                <div className="absolute bottom-0 right-0 flex space-x-1">
                  <input
                    type="file"
                    id="image-upload"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
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
                  
                  {(localImagePreview || avatar) && (
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
              
              {/* URL Input (toggleable) */}
              {showUrlInput && (
                <div className="w-full mb-4">
                  <label htmlFor="avatar" className="block text-xs font-medium text-gray-700 mb-1">
                    Enter image URL
                  </label>
                  <input
                    type="url"
                    id="avatar"
                    value={avatar}
                    onChange={(e) => {
                      setAvatar(e.target.value);
                      if (e.target.value) {
                        setLocalImagePreview(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
              )}
              
              <div className="text-xs text-center text-gray-500 mb-4">
                For best results, use a square image. Max size: 5MB.
              </div>
              
              <div className="w-full space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <div className="mt-1 w-full px-3 py-2 bg-gray-100 rounded-md text-gray-700">
                    {user.email}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Email cannot be changed
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 mr-3 text-gray-700 border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={`px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isLoading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
        
        {/* Security Tab */}
        {activeTab === 'security' && (
          <form onSubmit={handlePasswordUpdate} className="p-4">
            <div className="space-y-4">
              <div>
                <label htmlFor="current-password" className="block text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <input
                  type="password"
                  id="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <input
                  type="password"
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 mr-3 text-gray-700 border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={`px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isLoading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
