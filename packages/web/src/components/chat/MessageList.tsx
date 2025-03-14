import { useEffect, useRef, useState } from 'react';
import { useChat, FileType, FileAttachment } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { format } from 'date-fns';
import UploadingFileItem from './UploadingFileItem';
import DeleteMessageModal from '../common/DeleteMessageModal';
import ForwardMessageModal from '../common/ForwardMessageModal';

/**
 * Helper function to get initials from a name
 * Returns up to 2 initials (first and last name or first two words)
 */
const getInitials = (name: string): string => {
  if (!name) return '';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    // Get first letter of first and last name
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  } else {
    // Get first two letters of single name
    return name.substring(0, Math.min(2, name.length)).toUpperCase();
  }
};

/**
 * Validates if a string is a valid image URL or base64 image data
 */
const isValidImageSrc = (src: string | undefined): boolean => {
  if (!src) return false;
  
  // Check if it's a valid URL or base64 data
  return (
    src.startsWith('http://') || 
    src.startsWith('https://') || 
    src.startsWith('data:image/')
  );
};

/**
 * Renders a file attachment based on its type
 */
const AttachmentPreview = ({ attachment }: { attachment: FileAttachment }) => {
  const [loadState, setLoadState] = useState<'initial' | 'loading' | 'loaded' | 'error'>('initial');
  const [previewAvailable, setPreviewAvailable] = useState<boolean>(false);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);

  useEffect(() => {
    // Si es un video grande, verificar si está disponible
    if (attachment.isLargeFile && attachment.fileId && attachment.contentType.startsWith('video/')) {
      checkVideoAvailability();
    } else {
      setLoadState('loaded');
    }
  }, [attachment.fileId, retryCount]);

  // Verificar si el video está disponible
  const checkVideoAvailability = async () => {
    try {
      setLoadState('loading');
      const response = await fetch(`${apiBaseUrl}/chats/file/${attachment.fileId}?preview=true`);
      
      if (!response.ok) {
        if (retryCount < 10) {
          // Reintentamos después de un tiempo
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 2000); // Reintento cada 2 segundos
        } else {
          setLoadState('error');
          setVideoError('No se pudo acceder al video');
        }
        return;
      }
      
      const metadata = await response.json();
      if (metadata.complete) {
        setLoadState('loaded');
        setPreviewAvailable(true);
      } else {
        // Archivo todavía no está completo, reintentamos
        if (retryCount < 10) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 2000);
        } else {
          setLoadState('error');
          setVideoError('El video no se completó correctamente');
        }
      }
    } catch (error) {
      console.error("Error verificando disponibilidad del video:", error);
      setLoadState('error');
      setVideoError('Error al cargar el video');
    }
  };

  // Manejo de eventos de video
  const handleVideoPlay = () => {
    console.log('Video iniciado correctamente');
  };

  const handleVideoError = (event: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error('Error en la reproducción del video:', event);
    setVideoError('Error al reproducir el video');
    setLoadState('error');
  };

  const handleVideoBuffering = () => {
    setIsBuffering(true);
  };

  const handleVideoCanPlay = () => {
    setIsBuffering(false);
  };

  // Obtener la fuente del archivo
  const getAttachmentSource = () => {
    if (attachment.isLargeFile && attachment.fileId) {
      return `${apiBaseUrl}/chats/file/${attachment.fileId}`;
    }
    return `data:${attachment.contentType};base64,${attachment.data}`;
  };

  // Obtener la miniatura para videos
  const getThumbnailSource = () => {
    if (attachment.isLargeFile && attachment.fileId) {
      return `${apiBaseUrl}/chats/file/${attachment.fileId}/thumbnail`;
    }
    return '/video-placeholder.png';
  };

  // Descargar el archivo
  const handleDownload = () => {
    if (loadState !== 'loaded') return;
    
    const a = document.createElement('a');
    a.href = getAttachmentSource();
    a.download = attachment.filename || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Determinar el tipo de archivo
  const getFileType = () => {
    if (attachment.contentType.startsWith('image/')) return 'image';
    if (attachment.contentType.startsWith('video/')) return 'video';
    if (attachment.contentType.startsWith('audio/')) return 'audio';
    return 'document';
  };

  // Manejar fullscreen para videos
  const toggleFullscreen = () => {
    if (loadState !== 'loaded') return;
    setShowFullscreen(!showFullscreen);
  };

  const handleLoadedData = () => {
    setLoadState('loaded');
  };

  const handleRetry = () => {
    setRetryCount(0);
    setLoadState('initial');
  };

  const fileType = getFileType();
  const source = getAttachmentSource();
  
  // Render según el tipo de archivo
  switch (fileType) {
    case 'image':
      return (
        <div className="attachment-preview image-preview">
          <img 
            src={source} 
            alt={attachment.filename || 'Image'} 
            className="attachment-image"
            onLoad={() => setLoadState('loaded')}
            onError={() => setLoadState('error')}
          />
          {loadState === 'error' && (
            <div className="attachment-error">
              <p>Error al cargar la imagen</p>
              <button onClick={handleRetry}>Reintentar</button>
            </div>
          )}
          <div className="attachment-controls">
            <button 
              onClick={handleDownload} 
              className={`attachment-button ${loadState !== 'loaded' ? 'disabled' : ''}`}
              disabled={loadState !== 'loaded'}
            >
              <span>⬇️</span>
            </button>
            <button 
              onClick={toggleFullscreen} 
              className={`attachment-button ${loadState !== 'loaded' ? 'disabled' : ''}`}
              disabled={loadState !== 'loaded'}
            >
              <span>🔍</span>
            </button>
          </div>
          {showFullscreen && (
            <div className="fullscreen-overlay" onClick={toggleFullscreen}>
              <div className="fullscreen-content" onClick={e => e.stopPropagation()}>
                <img src={source} alt={attachment.filename || 'Image'} />
                <button onClick={toggleFullscreen} className="close-button">×</button>
              </div>
            </div>
          )}
        </div>
      );
    
    case 'video':
      return (
        <div className="attachment-preview video-preview">
          {loadState === 'initial' || loadState === 'loading' ? (
            <div className="video-placeholder">
              <img src={getThumbnailSource()} alt="Video thumbnail" />
              <div className="loading-indicator">
                {loadState === 'initial' ? 'Preparando video...' : 'Cargando video...'}
                <div className="loading-spinner"></div>
                <div className="loading-progress">{Math.min(retryCount * 10, 90)}%</div>
              </div>
            </div>
          ) : loadState === 'error' ? (
            <div className="video-error">
              <img src={getThumbnailSource()} alt="Video thumbnail" />
              <div className="error-message">
                <p>{videoError}</p>
                <button onClick={handleRetry} className="retry-button">Reintentar</button>
              </div>
            </div>
          ) : (
            <video 
              ref={videoRef}
              src={source} 
              controls 
              className="attachment-video loaded"
              onPlay={handleVideoPlay}
              onError={handleVideoError}
              onWaiting={handleVideoBuffering}
              onCanPlay={handleVideoCanPlay}
              poster={getThumbnailSource()}
              preload="metadata"
            />
          )}
          <div className="attachment-controls">
            <button 
              onClick={handleDownload} 
              className={`attachment-button ${loadState !== 'loaded' ? 'disabled' : ''}`}
              disabled={loadState !== 'loaded'}
            >
              <span>⬇️</span>
            </button>
            <button 
              onClick={toggleFullscreen}
              className={`attachment-button ${loadState !== 'loaded' ? 'disabled' : ''}`}
              disabled={loadState !== 'loaded'}
            >
              <span>🔍</span>
            </button>
          </div>
          {showFullscreen && loadState === 'loaded' && (
            <div className="fullscreen-overlay" onClick={toggleFullscreen}>
              <div className="fullscreen-content" onClick={e => e.stopPropagation()}>
                <video 
                  src={source} 
                  controls 
                  autoPlay
                  className="fullscreen-video"
                />
                <button onClick={toggleFullscreen} className="close-button">×</button>
              </div>
            </div>
          )}
          {isBuffering && (
            <div className="buffering-indicator">
              <div className="loading-spinner"></div>
              <p>Cargando...</p>
            </div>
          )}
        </div>
      );
    
    case 'audio':
      return (
        <div className="attachment-preview audio-preview">
          <audio 
            src={source} 
            controls 
            className="attachment-audio"
            onError={() => setLoadState('error')}
          />
          {loadState === 'error' && (
            <div className="attachment-error">
              <p>Error al cargar el audio</p>
              <button onClick={handleRetry}>Reintentar</button>
            </div>
          )}
          <div className="attachment-controls">
            <button 
              onClick={handleDownload}
              className={`attachment-button ${loadState !== 'loaded' ? 'disabled' : ''}`}
              disabled={loadState !== 'loaded'}
            >
              <span>⬇️</span>
            </button>
          </div>
        </div>
      );
    
    case 'document':
      return (
        <div className="attachment-preview document-preview">
          <div className="document-icon">
            <span>📄</span>
            <span className="document-name">{attachment.filename}</span>
          </div>
          <div className="attachment-controls">
            <button onClick={handleDownload} className="attachment-button">
              <span>⬇️</span>
            </button>
          </div>
        </div>
      );
    
    default:
      return (
        <div className="attachment-preview">
          <div className="document-icon">
            <span>🔗</span>
            <span className="document-name">{attachment.filename}</span>
          </div>
          <div className="attachment-controls">
            <button onClick={handleDownload} className="attachment-button">
              <span>⬇️</span>
            </button>
          </div>
        </div>
      );
  }
};

/**
 * Interface for reconstructed file chunks
 */
interface FileChunkInfo {
  chunks: FileAttachment[];
  complete: boolean;
  contentType: string;
  fileType: FileType;
}

/**
 * Utilidad para reconstruir archivos fragmentados
 */
const reconstructFileFromChunks = (chunks: FileAttachment[]): string => {
  // Ordenar los chunks por índice (por si acaso)
  const sortedChunks = [...chunks].sort((a, b) => 
    (a.chunkIndex || 0) - (b.chunkIndex || 0));
  
  // Concatenar todos los datos base64
  const fullBase64 = sortedChunks.map(chunk => chunk.data).join('');
  
  return fullBase64;
};

/**
 * Componente para mostrar archivos reconstruidos de fragmentos
 */
const ReconstructedAttachment = ({ originalFile, fileInfo }: { 
  originalFile: string, 
  fileInfo: FileChunkInfo 
}) => {
  const [expanded, setExpanded] = useState(false);
  const [fullscreenView, setFullscreenView] = useState(false);
  
  const toggleExpand = () => {
    setExpanded(!expanded);
  };
  
  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFullscreenView(!fullscreenView);
  };
  
  const closeFullscreen = () => {
    setFullscreenView(false);
  };
  
  const { fileType, contentType, chunks } = fileInfo;
  const fullData = reconstructFileFromChunks(chunks);
  const base64Src = `data:${contentType};base64,${fullData}`;
  
  const totalSize = chunks.reduce((total, chunk) => total + (chunk.size || 0), 0);
  
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  switch (fileType) {
    case FileType.VIDEO:
      return (
        <>
          <div className="mt-2 relative">
            <div className={`bg-gray-100 rounded-lg overflow-hidden ${expanded ? 'w-full max-w-2xl' : 'w-72'}`}>
              <div className="relative">
                <video 
                  src={base64Src} 
                  controls 
                  className="w-full h-full max-h-96 object-contain"
                  controlsList="nodownload"
                  onError={(e) => console.error("Video error:", e)}
                >
                  Your browser does not support the video tag.
                </video>
                <div className="absolute top-2 right-2 flex space-x-2">
                  <button 
                    className="bg-black bg-opacity-50 text-white p-1.5 rounded-full hover:bg-opacity-70 transition-all"
                    onClick={toggleExpand}
                    title="Expand/Collapse"
                  >
                    {expanded ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 01-1 1h-3a1 1 0 110-2h3V9a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <a 
                    href={base64Src}
                    download={originalFile}
                    className="bg-black bg-opacity-50 text-white p-1.5 rounded-full hover:bg-opacity-70 transition-all"
                    onClick={(e) => e.stopPropagation()}
                    title="Download video"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </a>
                </div>
              </div>
              <div className="px-3 py-2 text-sm text-gray-700">
                <div className="font-medium truncate max-w-xs">{originalFile}</div>
                <div className="text-xs text-gray-500">{formatFileSize(totalSize)}</div>
              </div>
            </div>
          </div>
          
          {fullscreenView && (
            <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center" onClick={closeFullscreen}>
              <div className="relative w-full max-w-6xl max-h-screen p-4">
                <video 
                  src={base64Src} 
                  controls 
                  className="w-full h-full max-h-[90vh] object-contain"
                >
                  Your browser does not support the video tag.
                </video>
                <button 
                  className="absolute top-4 right-4 bg-white text-black p-2 rounded-full"
                  onClick={closeFullscreen}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </>
      );
      
    // Para otros tipos de archivos, implementar manejo similar...
    default:
      return (
        <div className="mt-2 bg-gray-100 rounded-lg p-3">
          <div className="flex items-center">
            <div className="flex-shrink-0 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-grow">
              <div className="text-sm font-medium">{originalFile}</div>
              <div className="text-xs text-gray-500">
                {formatFileSize(totalSize)} • Reconstruido de {chunks.length} fragmentos
              </div>
            </div>
            <a 
              href={base64Src}
              download={originalFile}
              className="ml-3 bg-blue-100 text-blue-800 p-1.5 rounded-full hover:bg-blue-200 transition-all"
              title="Download file"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </div>
      );
  }
};

interface FileChunkMap {
  [filename: string]: FileChunkInfo;
}

export default function MessageList() {
  const { messages, typingUsers, uploadingFiles, retryFileUpload, cancelFileUpload, deleteMessage } = useChat();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [fileChunks, setFileChunks] = useState<FileChunkMap>({});
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [selectedMessageForForward, setSelectedMessageForForward] = useState<{
    id: string;
    content: string;
    sender: {
      _id: string;
      name: string;
      avatar?: string;
    };
    date: string;
  } | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle failed image loads
  const handleImageError = (senderId: string) => {
    setFailedImages(prev => ({
      ...prev,
      [senderId]: true
    }));
  };

  // Reconstruir archivos fragmentados
  useEffect(() => {
    // Buscar todos los chunks en los mensajes
    const chunks: FileChunkMap = {};
    
    messages.forEach(message => {
      if (!message.attachments) return;
      
      message.attachments.forEach(attachment => {
        if (attachment.isChunk && attachment.originalFilename) {
          if (!chunks[attachment.originalFilename]) {
            chunks[attachment.originalFilename] = {
              chunks: [],
              complete: false,
              contentType: attachment.contentType,
              fileType: attachment.fileType
            };
          }
          chunks[attachment.originalFilename].chunks.push(attachment);
        }
      });
    });
    
    // Verificar si los archivos están completos
    Object.keys(chunks).forEach(filename => {
      const info = chunks[filename];
      if (info.chunks.length > 0) {
        const lastChunk = info.chunks[info.chunks.length - 1];
        if (lastChunk.chunkIndex !== undefined && lastChunk.totalChunks && 
            lastChunk.chunkIndex === lastChunk.totalChunks - 1) {
          info.complete = true;
        }
      }
    });
    
    setFileChunks(chunks);
  }, [messages]);

  // Pending uploads section
  const hasUploadingFiles = Object.keys(uploadingFiles).length > 0;

  // Render uploading files
  const renderUploadingFiles = () => {
    if (!hasUploadingFiles) return null;
    
    return (
      <div className="uploading-files-container my-4 p-3 bg-gray-100 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Archivos subiendo...</h3>
        <div className="uploading-files-list space-y-2">
          {Object.entries(uploadingFiles).filter(([_, status]) => status.progress < 100).map(([tempId, progress]) => {
            // Buscamos el archivo correspondiente en los mensajes
            let file: FileAttachment | undefined;
            for (const message of messages) {
              if (message.attachments) {
                file = message.attachments.find(att => att.tempId === tempId);
                if (file) break;
              }
            }
            
            if (!file) return null;
            
            return (
              <UploadingFileItem 
                key={tempId}
                file={file}
                progress={progress.progress}
                error={progress.error}
                onRetry={() => retryFileUpload(file!)}
                onCancel={() => cancelFileUpload(file!)}
              />
            );
          })}
        </div>
      </div>
    );
  };

  if (Object.keys(uploadingFiles).length > 0 && !messages.length) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4">
          <div className="uploading-files-container p-3 bg-gray-100 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Archivos subiendo...</h3>
            <div className="uploading-files-list space-y-2">
              {Object.entries(uploadingFiles).filter(([_, status]) => status.progress < 100).map(([tempId, status]) => {
                // Como no hay mensajes todavía, creamos un objeto temporal
                // solo para la visualización
                const tempFile: FileAttachment = {
                  tempId,
                  filename: `Archivo ${tempId}`,
                  contentType: 'application/octet-stream',
                  fileType: FileType.DOCUMENT
                };
                
                return (
                  <UploadingFileItem
                    key={tempId}
                    file={tempFile}
                    progress={status.progress}
                    error={status.error}
                    onRetry={() => retryFileUpload(tempFile)}
                    onCancel={() => cancelFileUpload(tempFile)}
                  />
                );
              })}
            </div>
          </div>
        </div>
        <div ref={messagesEndRef} />
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
    .map(([userId, value]) => typeof value === 'string' ? value : userId);

  // Función para manejar la eliminación de mensajes
  const handleDeleteClick = (messageId: string) => {
    setMessageToDelete(messageId);
    setDeleteModalOpen(true);
  };

  const handleForwardClick = (message: any) => {
    setSelectedMessageForForward({
      id: message._id,
      content: message.content || '',
      sender: {
        _id: message.sender._id,
        name: message.sender.name,
        avatar: message.sender.avatar
      },
      date: message.createdAt
    });
    setForwardModalOpen(true);
  };

  // Función para eliminar mensaje solo para mí
  const handleDeleteForMe = async () => {
    if (messageToDelete) {
      const success = await deleteMessage(messageToDelete, false);
      if (success) {
        console.log('Mensaje eliminado para mí');
      } else {
        console.error('Error al eliminar mensaje');
      }
    }
    setDeleteModalOpen(false);
    setMessageToDelete(null);
  };

  // Función para eliminar mensaje para todos
  const handleDeleteForEveryone = async () => {
    if (messageToDelete) {
      const success = await deleteMessage(messageToDelete, true);
      if (success) {
        console.log('Mensaje eliminado para todos');
      } else {
        console.error('Error al eliminar mensaje para todos');
      }
    }
    setDeleteModalOpen(false);
    setMessageToDelete(null);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
      {renderUploadingFiles()}
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
            // Corregir la detección de mensajes propios considerando tanto _id como id
            const isOwnMessage = message.sender._id === user?.id || message.sender.id === user?.id;
            
            const senderId = message.sender._id || message.sender.id || '';
            const hasAttachments = message.attachments && message.attachments.length > 0;

            const nonChunkAttachments = message.attachments?.filter(att => !att.isChunk) || [];

            // Filtrar mensajes que son solo chunks para evitar duplicados en la UI
            if (
              (!message.attachments || message.attachments.length === 0 || 
               (message.attachments.length > 0 && message.attachments.every(att => att.isChunk))) && 
              (!message.content || message.content.includes("Parte ") || 
               message.content.includes("Enviando ") || 
               message.content === "Enviando archivos grandes...")
            ) {
              return null;
            }

            return (
              <div
                key={message._id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group relative`}
              >
                <div className={`flex max-w-xs md:max-w-md lg:max-w-lg ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                  {!isOwnMessage && (
                    <div className="flex-shrink-0 mr-3">
                      <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                        {message.sender.avatar && isValidImageSrc(message.sender.avatar) && !failedImages[senderId] ? (
                          <Image
                            src={message.sender.avatar}
                            alt={message.sender.name}
                            width={32}
                            height={32}
                            className="h-full w-full object-cover"
                            onError={() => handleImageError(senderId)}
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-700">
                            {getInitials(message.sender.name)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className={`
                    ${isOwnMessage 
                      ? 'bg-primary-500 text-white rounded-tl-lg rounded-tr-none' 
                      : 'bg-gray-200 text-gray-800 rounded-tr-lg rounded-tl-none'
                    }
                    rounded-bl-lg rounded-br-lg p-3 shadow-sm
                    relative
                  `}>
                    {!isOwnMessage && (
                      <div className="font-medium text-xs mb-1">
                        {message.sender.name}
                      </div>
                    )}
                    {message.content && (
                      <div>
                        {message.content}
                      </div>
                    )}
                    
                    {/* Display attachments */}
                    {hasAttachments && (
                      <div className={`${message.content ? 'mt-2' : ''}`}>
                        {nonChunkAttachments?.map((attachment, index) => (
                          <AttachmentPreview 
                            key={`${message._id}-attachment-${index}`} 
                            attachment={attachment} 
                          />
                        ))}
                      </div>
                    )}
                    
                    <div className="text-xs mt-1 opacity-80">
                      {format(new Date(message.createdAt), 'h:mm a')}
                    </div>
                    {isOwnMessage && (
                      <div className="absolute bottom-1 right-1 flex space-x-1">
                        <button 
                          className="text-xs text-white bg-gray-500 hover:bg-red-500 p-1 rounded-full transition-all opacity-0 group-hover:opacity-100 z-10"
                          onClick={() => handleDeleteClick(message._id)}
                          aria-label="Delete message"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <button
                          className="text-xs text-white bg-gray-500 hover:bg-primary-500 p-1 rounded-full transition-all opacity-0 group-hover:opacity-100 z-10"
                          onClick={() => handleForwardClick(message)}
                          aria-label="Forward message"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    )}
                    {!isOwnMessage && (
                      <div className="absolute bottom-1 left-1 flex space-x-1">
                        <button
                          className="text-xs text-white bg-gray-500 hover:bg-primary-500 p-1 rounded-full transition-all opacity-0 group-hover:opacity-100 z-10"
                          onClick={() => handleForwardClick(message)}
                          aria-label="Forward message"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      
      {/* Mostrar archivos que se están cargando actualmente */}
      {Object.keys(uploadingFiles).length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-white shadow border border-gray-200">
          <div className="text-sm font-medium mb-3 text-gray-700 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Archivos en proceso
          </div>
          <div className="space-y-2 mt-2">
            {Object.entries(uploadingFiles).filter(([_, status]) => status.progress < 100).map(([tempId, status]) => {
              // Buscar el archivo correspondiente en el contexto
              const file = messages.flatMap(msg => 
                msg.attachments?.filter(att => att.tempId === tempId) || []
              )[0];
              
              if (!file) return null;
              
              return (
                <UploadingFileItem
                  key={tempId}
                  file={file}
                  progress={status.progress}
                  error={status.error}
                  onRetry={() => retryFileUpload(file)}
                  onCancel={() => cancelFileUpload(file)}
                />
              );
            })}
          </div>
        </div>
      )}
      
      {/* Mostramos los archivos reconstruidos (solo si están completos) */}
      {Object.entries(fileChunks)
        .filter(([_, info]) => info.complete)
        .map(([filename, info]) => (
          <div key={`reconstructed-${filename}`} className="mb-4 border border-gray-200 p-3 rounded-lg">
            <div className="text-sm font-medium mb-2 text-gray-700">
              Archivo reconstruido:
            </div>
            <ReconstructedAttachment 
              originalFile={filename} 
              fileInfo={info} 
            />
          </div>
        ))
      }
      
      {/* Show typing indicator */}
      {typingUsersList.length > 0 && (
        <div className="flex items-center space-x-2 text-gray-500 text-sm">
          <div className="flex space-x-1">
            <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '200ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '400ms' }}></div>
          </div>
          <span>
            {typingUsersList.length === 1 
              ? `${typingUsersList[0]} is typing...` 
              : `${typingUsersList.length} people are typing...`}
          </span>
        </div>
      )}

      {/* Empty div to allow scrolling to bottom of messages */}
      <div ref={messagesEndRef} />
      {deleteModalOpen && (
        <DeleteMessageModal 
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onDeleteForMe={handleDeleteForMe}
          onDeleteForEveryone={handleDeleteForEveryone}
          canDeleteForEveryone={true}
        />
      )}
      {forwardModalOpen && selectedMessageForForward && (
        <ForwardMessageModal
          isOpen={forwardModalOpen}
          onClose={() => {
            setForwardModalOpen(false);
            setSelectedMessageForForward(null);
          }}
          messageId={selectedMessageForForward.id}
          messageContent={selectedMessageForForward.content}
          messageSender={selectedMessageForForward.sender}
          messageDate={selectedMessageForForward.date}
        />
      )}
    </div>
  );
}
