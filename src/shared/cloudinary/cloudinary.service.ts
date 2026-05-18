import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiErrorResponse,
  UploadApiResponse,
} from 'cloudinary';

@Injectable()
export class CloudinaryService implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    cloudinary.config({
      cloud_name: this.configService.get<string>('cloudinary.cloudName'),
      api_key: this.configService.get<string>('cloudinary.apiKey'),
      api_secret: this.configService.get<string>('cloudinary.apiSecret'),
    });
  }

  async uploadImage(
    fileBuffer: Buffer,
    folder = 'restaurant/avatars',
  ): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder, resource_type: 'image' },
          (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
            if (error || !result) return reject(error);
            resolve({ url: result.secure_url, publicId: result.public_id });
          },
        )
        .end(fileBuffer);
    });
  }

  async uploadImages(
    fileBuffers: Buffer[],
    folder = 'restaurant/avatars',
  ): Promise<{ url: string; publicId: string }[]> {
    return Promise.all(
      fileBuffers.map((buffer) => this.uploadImage(buffer, folder)),
    );
  }

  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
