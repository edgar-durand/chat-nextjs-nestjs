export interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  isOnline?: boolean;
}

export interface Room {
  _id: string;
  name: string;
  imageUrl?: string;
  description?: string;
  members?: User[];
  createdAt?: string;
}

export interface Message {
  _id: string;
  content: string;
  sender: User;
  recipient?: User;
  room?: Room;
  createdAt: string;
  isRead: boolean;
  attachments?: FileAttachment[];
  deletedFor?: string[];
  deletedForEveryone?: boolean;
}

export interface FileAttachment {
  filename: string;
  contentType: string;
  fileType: FileType;
  data?: string;
  size?: number;
  fileId?: string;
  isLargeFile?: boolean;
}

export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  AUDIO = 'audio'
}
