import { Injectable, Logger } from '@nestjs/common';
import * as mammoth from 'mammoth';
import PizZip from 'pizzip';

export interface ExtractedImage {
  id: string;
  buffer: Buffer;
  extension: string;
  contentType: string;
}

export interface ExtractionResult {
  text: string;
  images: Map<string, ExtractedImage>;
}

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);

  async extractText(fileBuffer: Buffer): Promise<string> {
    const result = await this.extractContent(fileBuffer);
    return result.text;
  }

  async extractContent(fileBuffer: Buffer): Promise<ExtractionResult> {
    this.logger.log('Extracting content from uploaded document...');

    const images = new Map<string, ExtractedImage>();
    let imageCounter = 0;

    try {
      // First, extract images directly from the docx archive
      await this.extractImagesFromDocx(fileBuffer, images);

      // Then extract text with image placeholders
      const result = await mammoth.convertToHtml(
        { buffer: fileBuffer },
        {
          convertImage: mammoth.images.imgElement((image) => {
            imageCounter++;
            const imageId = `img_${imageCounter}`;
            const extension = image.contentType.split('/')[1] || 'png';

            return image.read().then((imageBuffer) => {
              images.set(imageId, {
                id: imageId,
                buffer: imageBuffer,
                extension,
                contentType: image.contentType,
              });

              // Return a placeholder that we can find in the text
              return { src: `{%${imageId}%}` };
            });
          }),
        },
      );

      // Convert HTML to plain text but preserve image placeholders
      let text = result.value
        .replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/g, '\n$1\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      if (result.messages && result.messages.length > 0) {
        result.messages.forEach((msg) => {
          this.logger.warn(`Mammoth warning: ${msg.message}`);
        });
      }

      this.logger.log(
        `Extracted ${text.length} characters and ${images.size} images`,
      );

      return { text, images };
    } catch (error) {
      this.logger.error('Failed to extract content from document', error);
      throw new Error(
        `Document extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async extractImagesFromDocx(
    fileBuffer: Buffer,
    images: Map<string, ExtractedImage>,
  ): Promise<void> {
    try {
      const zip = new PizZip(fileBuffer);
      const mediaFiles = Object.keys(zip.files).filter((name) =>
        name.startsWith('word/media/'),
      );

      this.logger.log(`Found ${mediaFiles.length} media files in document`);

      mediaFiles.forEach((filePath, index) => {
        const file = zip.files[filePath];
        if (!file.dir) {
          const buffer = file.asNodeBuffer();
          const extension = filePath.split('.').pop() || 'png';
          const contentType = this.getContentType(extension);
          const imageId = `media_${index + 1}`;

          images.set(imageId, {
            id: imageId,
            buffer,
            extension,
            contentType,
          });
        }
      });
    } catch (error) {
      this.logger.warn('Could not extract media files from docx', error);
    }
  }

  private getContentType(extension: string): string {
    const types: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      bmp: 'image/bmp',
      svg: 'image/svg+xml',
      webp: 'image/webp',
    };
    return types[extension.toLowerCase()] || 'image/png';
  }
}
