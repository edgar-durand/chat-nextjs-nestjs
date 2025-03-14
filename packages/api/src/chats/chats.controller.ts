import { Controller, Get, Post, Body, Param, UseGuards, Request, Res, Query, Delete } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Message } from './schemas/message.schema';
import { Response } from 'express';
import { FileStorageService } from '../file-storage/file-storage.service';

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatsController {
  constructor(
    private readonly chatsService: ChatsService,
    private readonly fileStorageService: FileStorageService
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
  async getFile(
    @Param('fileId') fileId: string, 
    @Query('preview') preview: string,
    @Res() res: Response
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
      
      // Configurar cabeceras apropiadas
      res.setHeader('Content-Type', result.file.contentType);
      res.setHeader('Content-Disposition', `inline; filename=${result.file.originalFilename}`);
      res.setHeader('Content-Length', fileData.length);
      
      // Añadir cabeceras para mejorar la reproducción de video
      if (result.file.contentType.startsWith('video/')) {
        res.setHeader('Accept-Ranges', 'bytes');
        // Permitir CORS para la reproducción en diferentes dominios
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Range');
      }
      
      // Enviar los datos del archivo
      return res.send(fileData);
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
