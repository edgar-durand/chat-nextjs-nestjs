import { Controller, Post, Get, Delete, Param, Body, UploadedFile, UseInterceptors, Res, HttpException, HttpStatus, ParseFilePipeBuilder, MaxFileSizeValidator } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FileStorageService, FileChunk } from './file-storage.service';

@Controller('file-storage')
export class FileStorageController {
  constructor(private readonly fileStorageService: FileStorageService) {}

  @Post('initialize')
  async initializeFile(@Body() fileData: {
    originalFilename: string;
    contentType: string;
    size: number;
    totalChunks: number;
    chunkSize: number;
  }) {
    try {
      const fileId = await this.fileStorageService.initializeFile(fileData);
      return { success: true, fileId, filename: `${Date.now()}-${fileData.originalFilename}` };
    } catch (error) {
      throw new HttpException(
        `Failed to initialize file: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('chunk')
  async uploadChunk(@Body() chunkData: FileChunk) {
    try {
      const isComplete = await this.fileStorageService.addChunk(chunkData);
      return { success: true, complete: isComplete };
    } catch (error) {
      throw new HttpException(
        `Failed to upload chunk: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':fileId')
  async getFile(@Param('fileId') fileId: string, @Res() res: Response) {
    try {
      const result = await this.fileStorageService.getFile(fileId);
      if (!result || !result.file) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }

      if (!result.file.complete) {
        throw new HttpException('File is not complete yet', HttpStatus.BAD_REQUEST);
      }

      // El resultado ya contiene los datos del archivo, no es necesario concatenar chunks
      const fileData = result.data;
      
      // Set appropriate headers
      res.setHeader('Content-Type', result.file.contentType);
      res.setHeader('Content-Disposition', `attachment; filename=${result.file.originalFilename}`);
      res.setHeader('Content-Length', fileData.length);
      
      // Send the file data
      res.send(fileData);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to retrieve file: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async listFiles() {
    try {
      const files = await this.fileStorageService.listFiles();
      return { success: true, files };
    } catch (error) {
      throw new HttpException(
        `Failed to list files: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':fileId')
  async deleteFile(@Param('fileId') fileId: string) {
    try {
      const success = await this.fileStorageService.deleteFile(fileId);
      if (!success) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }
      return { success: true };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to delete file: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
