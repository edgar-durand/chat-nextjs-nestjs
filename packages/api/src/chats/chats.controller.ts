import { Controller, Get, Post, Body, Param, UseGuards, Request, Res, Query, Delete } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Message } from './schemas/message.schema';
import { Response } from 'express';
import { FileStorageService } from '../file-storage/file-storage.service';
import { Public } from '../auth/decorators/public.decorator';
import { ChatGateway } from './gateways/chat.gateway';

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatsController {
  constructor(
    private readonly chatsService: ChatsService,
    private readonly fileStorageService: FileStorageService,
    private readonly chatGateway: ChatGateway
  ) {}

  @Post()
  create(@Body() createMessageDto: CreateMessageDto, @Request() req): Promise<Message> {
    return this.chatsService.create(createMessageDto, req.user);
  }

  @Get('direct/:recipientId')
  findDirectMessages(@Param('recipientId') recipientId: string, @Request() req): Promise<Message[]> {
    return this.chatsService.findDirectMessages(req.user._id, recipientId);
  }

  @Delete('direct/:recipientId')
  async clearDirectMessages(
    @Param('recipientId') recipientId: string,
    @Request() req
  ) {
    try {
      const result = await this.chatsService.clearDirectMessageHistory(req.user._id, recipientId);
      return { 
        success: true, 
        message: `Se han eliminado ${result.deletedCount} mensajes del historial`, 
        deletedCount: result.deletedCount 
      };
    } catch (error) {
      return { 
        success: false, 
        message: error.message || 'Error al limpiar el historial de mensajes' 
      };
    }
  }

  @Get('room/:roomId')
  findRoomMessages(@Param('roomId') roomId: string): Promise<Message[]> {
    return this.chatsService.findRoomMessages(roomId);
  }

  @Get('file/:fileId')
  @Public()
  async getFile(
    @Param('fileId') fileId: string, 
    @Query('preview') preview: string,
    @Res() res: Response,
    @Request() req
  ) {
    try {
      const result = await this.fileStorageService.getFile(fileId);
      
      if (!result || !result.file || !result.file.complete) {
        return res.status(404).json({ message: 'Archivo no encontrado o incompleto' });
      }
      
      // Si solo queremos una vista previa, devolvemos los metadatos
      if (preview === 'true') {
        const metadata = await this.fileStorageService.getFileMetadata(fileId);
        if (metadata) {
          return res.json(metadata);
        }
        return res.status(404).json({ message: 'Metadatos no disponibles' });
      }
      
      // Ya no necesitamos concatenar chunks, el resultado ya contiene los datos
      const fileData = result.data;
      const fileSize = fileData.length;
      
      // Nombre de archivo seguro para encabezados HTTP
      const safeFilename = encodeURIComponent(result.file.originalFilename).replace(/['()]/g, escape);
      
      // Configurar cabeceras básicas
      res.setHeader('Content-Type', result.file.contentType);
      res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache de 1 hora
      
      // CORS headers para reproducción cross-domain
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      
      // Manejo de solicitudes de rango (Range Requests)
      const rangeHeader = req.headers.range;
      
      if (rangeHeader && result.file.contentType.startsWith('video/')) {
        console.log(`Solicitud de rango recibida: ${rangeHeader}`);
        
        // Parsear el header de rango
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        
        // Validar rangos
        if (isNaN(start) || start < 0 || start >= fileSize) {
          return res.status(416).send('Requested Range Not Satisfiable');
        }
        
        const chunkSize = (end - start) + 1;
        console.log(`Streaming video desde byte ${start} hasta ${end} (${chunkSize} bytes)`);
        
        // Enviar respuesta parcial (206 Partial Content)
        res.statusCode = 206;
        res.setHeader('Content-Length', chunkSize);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        
        // Extraer y enviar solo el fragmento solicitado
        const chunk = fileData.slice(start, end + 1);
        return res.end(chunk);
      }
      
      // Para solicitudes sin rango o archivos que no son video, enviar todo el archivo
      res.setHeader('Content-Length', fileSize);
      return res.end(fileData);
    } catch (error) {
      console.error('Error al recuperar archivo:', error);
      return res.status(500).json({ message: 'Error al obtener el archivo', error: error.message });
    }
  }

  @Get('file/:fileId/thumbnail')
  async getFileThumbnail(@Param('fileId') fileId: string, @Res() res: Response) {
    try {
      const metadata = await this.fileStorageService.getFileMetadata(fileId);
      
      if (!metadata) {
        return res.status(404).json({ message: 'Archivo no encontrado' });
      }
      
      // Si ya tenemos una miniatura, la devolvemos
      const result = await this.fileStorageService.getFile(fileId);
      if (result.file.thumbnail) {
        res.setHeader('Content-Type', 'image/jpeg');
        return res.send(Buffer.from(result.file.thumbnail, 'base64'));
      }
      
      // Para videos, devolvemos una miniatura genérica
      if (metadata.mediaType === 'video') {
        res.setHeader('Content-Type', 'image/png');
        res.sendFile('video-placeholder.png', { root: './public' });
        return;
      }
      
      // Para otros tipos, devolvemos una respuesta básica
      return res.json({
        fileType: metadata.fileType,
        mediaType: metadata.mediaType,
        filename: metadata.filename
      });
    } catch (error) {
      console.error('Error al obtener miniatura:', error);
      return res.status(500).json({ message: 'Error al obtener la miniatura', error: error.message });
    }
  }

  @Delete('message/:messageId')
  async deleteMessage(
    @Param('messageId') messageId: string,
    @Query('deleteForEveryone') deleteForEveryone: string,
    @Request() req
  ) {
    try {
      const result = await this.chatsService.deleteMessage(
        messageId, 
        req.user._id, 
        deleteForEveryone === 'true'
      );
      
      // Enviar notificación en tiempo real a los usuarios correspondientes
      if (result) {
        if (deleteForEveryone === 'true') {
          // Si se eliminó para todos, emitir a la sala o al usuario correspondiente
          if (result.roomId) {
            // Si es un mensaje de sala, enviar a todos los miembros de la sala
            this.chatGateway.server.to(`room_${result.roomId}`).emit('message_deleted', {
              messageId: result._id,
              deleteForEveryone: true
            });
          } else if (result.recipientId) {
            // Si es un mensaje directo, enviar al destinatario
            this.chatGateway.server.to(`user_${result.recipientId}`).emit('message_deleted', {
              messageId: result._id,
              deleteForEveryone: true
            });
          }
        }
      }
      
      return { 
        success: true, 
        message: `Mensaje eliminado exitosamente`,
        deleted: result
      };
    } catch (error) {
      return { 
        success: false, 
        message: error.message || 'Error al eliminar el mensaje' 
      };
    }
  }

  @Post(':id/read')
  markAsRead(@Param('id') id: string): Promise<Message> {
    return this.chatsService.markAsRead(id);
  }

  @Get('unread')
  getUnreadCount(@Request() req): Promise<{ count: number }> {
    return this.chatsService.getUserUnreadCount(req.user._id)
      .then(count => ({ count }));
  }
}
