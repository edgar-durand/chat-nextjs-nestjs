import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FileStorage, FileStorageDocument } from './schemas/file-storage.schema';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Límite de tamaño para un documento de MongoDB (16MB - margen de seguridad)
 */
const MONGO_DOC_SIZE_LIMIT = 15 * 1024 * 1024; // 15MB

export interface FileChunk {
  filename: string;
  chunkIndex: number;
  totalChunks: number;
  chunkData: Buffer;
  contentType: string;
  originalFilename: string;
  size: number;
}

export interface FileStorageDto {
  fileId: string;
  filename: string;
  contentType: string;
  size: number;
  createdAt: Date;
}

@Injectable()
export class FileStorageService {
  private readonly filesDir: string;

  constructor(
    @InjectModel(FileStorage.name) private fileStorageModel: Model<FileStorageDocument>
  ) {
    // Crear directorio para archivos grandes si no existe
    this.filesDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.filesDir)) {
      fs.mkdirSync(this.filesDir, { recursive: true });
    }
  }

  async initializeFile(data: {
    originalFilename: string;
    contentType: string;
    size: number;
    totalChunks: number;
    chunkSize: number;
  }): Promise<string> {
    const newFile = new this.fileStorageModel({
      filename: `${Date.now()}-${data.originalFilename}`,
      originalFilename: data.originalFilename,
      contentType: data.contentType,
      size: data.size,
      chunkSize: data.chunkSize,
      totalChunks: data.totalChunks,
      chunks: Array(data.totalChunks).fill(null),
      complete: false,
    });

    const savedFile = await newFile.save();
    return savedFile._id.toString();
  }

  async addChunk(data: FileChunk): Promise<boolean> {
    const file = await this.fileStorageModel.findOne({ 
      filename: data.filename 
    });

    if (!file) {
      throw new Error(`File with name ${data.filename} not found`);
    }

    // Update the specific chunk
    file.chunks[data.chunkIndex] = data.chunkData;

    // Check if all chunks are present
    const complete = file.chunks.every(chunk => chunk != null);
    if (complete) {
      file.complete = true;
      
      // Actualizar metadata para fácil búsqueda
      file.mediaType = this.determineMediaType(data.contentType);
      file.fileType = this.determineFileType(data.contentType);
    }

    await file.save();
    return complete;
  }

  /**
   * Determina el tipo de medio (imagen, video, audio, documento)
   */
  private determineMediaType(contentType: string): string {
    if (contentType.startsWith('image/')) return 'image';
    if (contentType.startsWith('video/')) return 'video';
    if (contentType.startsWith('audio/')) return 'audio';
    return 'document';
  }

  /**
   * Determina el tipo de archivo específico
   */
  private determineFileType(contentType: string): string {
    return contentType.split('/')[1] || 'unknown';
  }

  /**
   * Sube un archivo completo en una sola operación
   * @param buffer Datos binarios del archivo completo
   * @param metadata Metadatos del archivo
   */
  async uploadCompleteFile(
    buffer: Buffer, 
    metadata: { originalFilename: string, contentType: string, size: number }
  ): Promise<string> {
    try {
      console.log(`Iniciando carga de archivo grande: ${metadata.originalFilename}, tamaño: ${metadata.size / 1024 / 1024}MB, tipo: ${metadata.contentType}`);
      
      // Validar que el buffer tenga datos
      if (!buffer || buffer.length === 0) {
        throw new Error('El buffer está vacío');
      }
      
      // Validar que el tamaño del buffer coincida aproximadamente con el tamaño reportado
      if (Math.abs(buffer.length - metadata.size) > metadata.size * 0.1) {
        console.warn(`Advertencia: Discrepancia en el tamaño del archivo. Reportado: ${metadata.size}, Recibido: ${buffer.length}`);
      }

      // Generar un nombre de archivo único para evitar colisiones
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(8).toString('hex');
      const fileExtension = path.extname(metadata.originalFilename);
      const safeFilename = `${timestamp}-${randomString}${fileExtension}`;
      const filePath = path.join(this.filesDir, safeFilename);
      
      // Determinar si guardamos en MongoDB o en el sistema de archivos
      let newFile;
      let storeInFilesystem = false;
      
      if (buffer.length > MONGO_DOC_SIZE_LIMIT) {
        // Si el archivo es demasiado grande para MongoDB, guardarlo en el sistema de archivos
        storeInFilesystem = true;
        console.log(`Archivo demasiado grande para MongoDB (${buffer.length / 1024 / 1024}MB), guardando en el sistema de archivos: ${filePath}`);
        
        // Escribir el archivo en el sistema de archivos
        await fs.promises.writeFile(filePath, buffer);
        
        // Crear documento en MongoDB sólo con los metadatos (sin el buffer)
        newFile = new this.fileStorageModel({
          filename: safeFilename,
          originalFilename: metadata.originalFilename,
          contentType: metadata.contentType,
          size: buffer.length,
          chunkSize: 0, // No aplica para almacenamiento en sistema de archivos
          totalChunks: 0, // No aplica para almacenamiento en sistema de archivos
          chunks: [], // No guardamos chunks en la base de datos
          complete: true,
          mediaType: this.determineMediaType(metadata.contentType),
          fileType: this.determineFileType(metadata.contentType),
          storedInFilesystem: true,
          filePath: filePath
        });
      } else {
        // Si el archivo es lo suficientemente pequeño, guardarlo en MongoDB
        console.log(`Guardando archivo en MongoDB: ${metadata.originalFilename} (${buffer.length / 1024 / 1024}MB)`);
        newFile = new this.fileStorageModel({
          filename: safeFilename,
          originalFilename: metadata.originalFilename,
          contentType: metadata.contentType,
          size: buffer.length,
          chunkSize: buffer.length,
          totalChunks: 1,
          chunks: [buffer],
          complete: true,
          mediaType: this.determineMediaType(metadata.contentType),
          fileType: this.determineFileType(metadata.contentType),
          storedInFilesystem: false
        });
      }

      console.log(`Guardando metadatos en base de datos: ${metadata.originalFilename}`);
      const savedFile = await newFile.save();
      console.log(`Archivo guardado exitosamente: ${savedFile._id.toString()}`);
      return savedFile._id.toString();
    } catch (error) {
      console.error('Error al guardar archivo completo:', error);
      throw error;
    }
  }

  async getFile(fileId: string): Promise<{ file: FileStorageDocument, data: Buffer }> {
    const file = await this.fileStorageModel.findById(fileId);
    
    if (!file) {
      throw new Error(`Archivo con ID ${fileId} no encontrado`);
    }
    
    if (!file.complete) {
      throw new Error(`Archivo con ID ${fileId} no está completo`);
    }
    
    let fileData: Buffer;
    
    // Si el archivo está almacenado en el sistema de archivos
    if (file.storedInFilesystem) {
      try {
        fileData = await fs.promises.readFile(file.filePath);
      } catch (error) {
        console.error(`Error leyendo archivo del sistema de archivos: ${file.filePath}`, error);
        throw new Error(`No se pudo leer el archivo del sistema de archivos: ${error.message}`);
      }
    } else {
      // Si el archivo está almacenado en MongoDB
      fileData = Buffer.concat(file.chunks);
    }
    
    return { file, data: fileData };
  }

  async getFileByName(filename: string): Promise<FileStorageDocument> {
    return this.fileStorageModel.findOne({ filename });
  }

  /**
   * Obtiene metadatos del archivo para generar miniatura
   */
  async getFileMetadata(fileId: string): Promise<{
    contentType: string;
    mediaType: string;
    fileType: string;
    size: number;
    filename: string;
    complete: boolean;
  }> {
    const file = await this.fileStorageModel.findById(fileId, {
      contentType: 1,
      mediaType: 1,
      fileType: 1,
      size: 1,
      originalFilename: 1,
      complete: 1
    });
    
    if (!file) return null;
    
    return {
      contentType: file.contentType,
      mediaType: file.mediaType || this.determineMediaType(file.contentType),
      fileType: file.fileType || this.determineFileType(file.contentType),
      size: file.size,
      filename: file.originalFilename,
      complete: file.complete
    };
  }

  async listFiles(): Promise<FileStorageDto[]> {
    const files = await this.fileStorageModel.find({ complete: true });
    return files.map(file => ({
      fileId: file._id.toString(),
      filename: file.originalFilename,
      contentType: file.contentType,
      size: file.size,
      createdAt: file['createdAt']
    }));
  }

  async deleteFile(fileId: string): Promise<boolean> {
    const result = await this.fileStorageModel.deleteOne({ _id: fileId });
    return result.deletedCount > 0;
  }
}
