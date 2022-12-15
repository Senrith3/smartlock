import { Injectable } from '@nestjs/common';
import { UploadApiErrorResponse, UploadApiResponse, v2 } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  async uploadImage(
    file: string,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return v2.uploader.upload(file);
  }
}
