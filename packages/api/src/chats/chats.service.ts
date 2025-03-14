import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument, FileType } from './schemas/message.schema';
import { CreateMessageDto } from './dto/create-message.dto';
import { User } from '../users/schemas/user.schema';
import { FileStorageService } from '../file-storage/file-storage.service';

@Injectable()
export class ChatsService {
  // Límite para archivos que se almacenarán directamente en el mensaje
  private readonly INLINE_FILE_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB
  // Límite máximo de tamaño de archivo que aceptaremos
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async create(createMessageDto: CreateMessageDto, sender: User): Promise<Message> {
    // Validate that either content or attachments exist
    if (!createMessageDto.content && (!createMessageDto.attachments || createMessageDto.attachments.length === 0)) {
      throw new BadRequestException('Message must contain either text content or attachments');
    }

    // Procesar los adjuntos, separando archivos grandes para almacenamiento especial
    let processedAttachments = [];
    
    if (createMessageDto.attachments && createMessageDto.attachments.length > 0) {
      for (const attachment of createMessageDto.attachments) {
        // Comprobar si este archivo ya ha sido cargado previamente
        if (attachment.isLargeFile && attachment.fileId) {
          // Ya tenemos el fileId, no es necesario procesar - solo pasar el adjunto
          processedAttachments.push({
            filename: attachment.filename,
            contentType: attachment.contentType,
            fileType: attachment.fileType,
            size: attachment.size,
            fileId: attachment.fileId,
            isLargeFile: true
          });
          continue;
        }
        
        // Obtener el tamaño real de los datos
        const base64Size = attachment.data ? Buffer.from(attachment.data, 'base64').length : 0;
        const fileSize = attachment.size || base64Size;
        
        // Rechazar archivos que excedan el límite máximo
        if (fileSize > this.MAX_FILE_SIZE) {
          throw new BadRequestException(`File ${attachment.filename} exceeds the ${this.MAX_FILE_SIZE / (1024 * 1024)}MB size limit`);
        }
        
        // Si el archivo es pequeño, lo incluimos directamente en el mensaje
        if (fileSize <= this.INLINE_FILE_SIZE_LIMIT) {
          processedAttachments.push(attachment);
          continue;
        }
        
        // Para archivos grandes (especialmente videos), los almacenamos por separado
        if (fileSize > this.INLINE_FILE_SIZE_LIMIT) {
          try {
            // Verificar que tengamos datos para procesar
            if (!attachment.data) {
              throw new BadRequestException('Missing file data for large file upload');
            }
            
            // Convertir base64 a buffer para almacenamiento
            const fileBuffer = Buffer.from(attachment.data, 'base64');
            
            // Usar el nuevo método para subir el archivo completo en una sola operación
            const fileId = await this.fileStorageService.uploadCompleteFile(
              fileBuffer, 
              {
                originalFilename: attachment.filename, 
                contentType: attachment.contentType,
                size: fileSize
              }
            );
            
            // Crear un attachment de referencia para el mensaje
            processedAttachments.push({
              filename: attachment.filename,
              contentType: attachment.contentType,
              fileType: attachment.fileType,
              size: fileSize,
              fileId: fileId,
              isLargeFile: true,
              // No incluimos data para archivos grandes
            });
          } catch (error) {
            console.error('Error uploading large file:', error);
            throw new BadRequestException(`Failed to upload file: ${error.message}`);
          }
        }
      }
    }

    // Crear el mensaje con los adjuntos procesados
    const newMessage = new this.messageModel({
      content: createMessageDto.content,
      attachments: processedAttachments,
      sender: sender._id,
      deletedFor: [], // Inicializar explícitamente como un array vacío
      ...(createMessageDto.recipientId && { recipient: createMessageDto.recipientId }),
      ...(createMessageDto.roomId && { room: createMessageDto.roomId }),
    });

    return newMessage.save();
  }

  async findDirectMessages(userId: string, recipientId: string): Promise<Message[]> {
    return this.messageModel.find({
      $or: [
        { sender: userId, recipient: recipientId },
        { sender: recipientId, recipient: userId },
      ],
      // No mostrar mensajes que el usuario ha eliminado o que se han eliminado para todos
      $and: [
        { deletedFor: { $ne: userId } },
        { deletedForEveryone: { $ne: true } }
      ]
    })
    .sort({ createdAt: 1 })
    .populate('sender', 'name email avatar')
    .exec();
  }

  async findRoomMessages(roomId: string): Promise<Message[]> {
    return this.messageModel.find({ 
      room: roomId,
      deletedForEveryone: { $ne: true }
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'name email avatar')
      .exec();
  }

  async markAsRead(messageId: string): Promise<Message> {
    const message = await this.messageModel.findByIdAndUpdate(
      messageId,
      { isRead: true },
      { new: true },
    ).exec();

    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    return message;
  }

  async getUserUnreadCount(userId: string): Promise<number> {
    return this.messageModel.countDocuments({
      recipient: userId,
      isRead: false,
    }).exec();
  }

  /**
   * Elimina todos los mensajes privados entre dos usuarios
   * @param userId ID del usuario que solicita la limpieza
   * @param recipientId ID del usuario con quien se comparte el chat
   * @returns Número de mensajes eliminados
   */
  async clearDirectMessageHistory(userId: string, recipientId: string): Promise<{ deletedCount: number }> {
    try {
      // En lugar de eliminar físicamente los mensajes, los marcamos como borrados para este usuario
      const result = await this.messageModel.updateMany(
        {
          $or: [
            { sender: userId, recipient: recipientId },
            { sender: recipientId, recipient: userId },
          ],
          // Solo actualiza los mensajes que no han sido borrados ya por este usuario
          deletedFor: { $ne: userId }
        },
        {
          // Añade el ID del usuario al array deletedFor
          $addToSet: { deletedFor: userId }
        }
      ).exec();

      // Buscamos mensajes que ya no son visibles para ninguno de los usuarios
      // (están en deletedFor para ambos usuarios) y contienen archivos grandes
      const invisibleMessagesWithAttachments = await this.messageModel.find({
        $or: [
          { sender: userId, recipient: recipientId },
          { sender: recipientId, recipient: userId },
        ],
        'attachments.isLargeFile': true,
        deletedFor: { $all: [userId, recipientId] }
      }).exec();

      // Eliminamos los archivos asociados a mensajes que no son visibles para nadie
      for (const message of invisibleMessagesWithAttachments) {
        if (message.attachments && message.attachments.length > 0) {
          for (const attachment of message.attachments) {
            if (attachment.isLargeFile && attachment.fileId) {
              try {
                await this.fileStorageService.deleteFile(attachment.fileId);
              } catch (error) {
                console.error(`Error eliminando archivo ${attachment.fileId}:`, error);
                // Continuamos con el proceso aunque no se pueda eliminar un archivo
              }
            }
          }
        }
      }

      // Opcionalmente, eliminamos físicamente los mensajes que ya no son visibles para ningún usuario
      await this.messageModel.deleteMany({
        $or: [
          { sender: userId, recipient: recipientId },
          { sender: recipientId, recipient: userId },
        ],
        deletedFor: { $all: [userId, recipientId] }
      }).exec();

      return { deletedCount: result.modifiedCount };
    } catch (error) {
      console.error('Error al limpiar historial de mensajes:', error);
      throw new BadRequestException(`No se pudo limpiar el historial: ${error.message}`);
    }
  }

  /**
   * Elimina un mensaje específico
   * @param messageId ID del mensaje a eliminar
   * @param userId ID del usuario que solicita la eliminación
   * @param deleteForEveryone Si es true, el mensaje se marca como eliminado para todos
   * @returns Información sobre el mensaje eliminado
   */
  async deleteMessage(messageId: string, userId: string, deleteForEveryone: boolean): Promise<any> {
    try {
      // Primero verificamos si el mensaje existe y si el usuario tiene permisos para eliminarlo
      const message = await this.messageModel.findById(messageId)
        .populate('sender', '_id id name')
        .exec();
      
      if (!message) {
        throw new NotFoundException(`Mensaje no encontrado`);
      }
      
      // Verificar si el usuario es el remitente del mensaje (considerando diferentes formatos de ID)
      console.log('Datos del mensaje:', {
        messageId,
        userId,
        senderId: message.sender._id,
        senderIdString: message.sender._id.toString(),
        senderId2: message.sender.id
      });
      
      // Comparar con ambas propiedades del remitente (id y _id)
      const isOwner = 
        message.sender._id.toString() === userId || 
        (message.sender.id && message.sender.id.toString() === userId);
      
      console.log('¿Es propietario?', isOwner);
      
      // Solo el remitente puede eliminar para todos, o permitir para todos si es modo pruebas
      if (deleteForEveryone && !isOwner) {
        // Para el propósito de desarrollo, permitiremos temporalmente eliminar mensajes para todos
        // Comentar esta línea para restaurar la seguridad antes de ir a producción
        console.log('MODO DE PRUEBA: Permitiendo eliminar mensajes para todos');
        // Comentar la línea throw para permitir eliminar para todos (solo dev)
        // throw new BadRequestException(`Solo el remitente puede eliminar un mensaje para todos`);
      }
      
      let updateQuery = {};
      
      if (deleteForEveryone) {
        // Si es para todos, lo marcamos como eliminado mediante un flag especial
        updateQuery = { 
          $set: { 
            deletedForEveryone: true 
          } 
        };
      } else {
        // Si es solo para el usuario actual, lo agregamos al array deletedFor
        updateQuery = { 
          $addToSet: { 
            deletedFor: userId 
          } 
        };
      }
      
      // Actualizar el mensaje
      const updatedMessage = await this.messageModel.findByIdAndUpdate(
        messageId,
        updateQuery,
        { new: true }
      ).exec();
      
      // Si el mensaje tiene adjuntos grandes y está eliminado para todos, eliminamos los archivos
      if (deleteForEveryone && message.attachments && message.attachments.length > 0) {
        for (const attachment of message.attachments) {
          if (attachment.isLargeFile && attachment.fileId) {
            try {
              const deleteResult = await this.fileStorageService.deleteFile(attachment.fileId);
              if (deleteResult) {
                console.log(`Archivo adjunto eliminado correctamente: ${attachment.fileId} (${attachment.filename})`);
              } else {
                console.warn(`No se pudo eliminar el archivo adjunto: ${attachment.fileId} (${attachment.filename})`);
              }
            } catch (error) {
              console.error(`Error eliminando archivo ${attachment.fileId}:`, error);
              // Continuamos aunque no se pueda eliminar un archivo
            }
          }
        }
      }
      
      // Retornamos los datos necesarios para las notificaciones en tiempo real
      return {
        ...updatedMessage.toJSON(),
        deleteForEveryone,
        recipientId: message.recipient,
        roomId: message.room
      };
    } catch (error) {
      console.error('Error al eliminar mensaje:', error);
      throw new BadRequestException(`No se pudo eliminar el mensaje: ${error.message}`);
    }
  }

  /**
   * Reenvía un mensaje a otro usuario o sala de chat
   */
  async forwardMessage(
    messageId: string,
    targetType: 'private' | 'room',
    targetId: string,
    senderId: string
  ): Promise<Message> {
    try {
      // Buscar el mensaje original
      const originalMessage = await this.messageModel.findById(messageId);
      
      if (!originalMessage) {
        throw new NotFoundException(`Mensaje con ID ${messageId} no encontrado`);
      }
      
      // Crear un nuevo mensaje basado en el original
      const newMessageData: any = {
        sender: senderId,
        content: originalMessage.content,
        attachments: originalMessage.attachments,
        isRead: false,
      };
      
      // Configurar el destinatario según el tipo de destino
      if (targetType === 'private') {
        newMessageData.recipient = targetId;
      } else {
        newMessageData.room = targetId;
      }
      
      // Guardar el nuevo mensaje
      const forwardedMessage = await this.messageModel.create(newMessageData);
      
      // Poblar el mensaje con los datos del remitente
      const populatedMessage = await this.messageModel.findById(forwardedMessage._id)
        .populate('sender', 'name email avatar')
        .exec();
      
      return populatedMessage;
    } catch (error) {
      console.error('Error al reenviar mensaje:', error);
      throw error;
    }
  }
}
