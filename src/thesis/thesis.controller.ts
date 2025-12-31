import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ThesisService } from './thesis.service';

@Controller('thesis')
export class ThesisController {
  private readonly logger = new Logger(ThesisController.name);

  constructor(private readonly thesisService: ThesisService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
      },
      fileFilter: (req, file, callback) => {
        if (
          file.mimetype ===
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.originalname.endsWith('.docx')
        ) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException('Only .docx files are allowed'),
            false,
          );
        }
      },
    }),
  )
  async uploadThesis(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`Received file upload: ${file?.originalname || 'unknown'}`);

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const outputBuffer = await this.thesisService.processThesis(file.buffer);

      const outputFilename = this.generateOutputFilename(file.originalname);

      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${outputFilename}"`,
        'Content-Length': outputBuffer.length,
      });

      res.status(HttpStatus.OK).send(outputBuffer);
      this.logger.log(`Successfully returned formatted thesis: ${outputFilename}`);
    } catch (error) {
      this.logger.error('Thesis processing failed', error);
      throw error;
    }
  }

  private generateOutputFilename(originalName: string): string {
    const baseName = originalName.replace(/\.docx$/i, '');
    const timestamp = new Date().toISOString().slice(0, 10);
    return `${baseName}_formatted_${timestamp}.docx`;
  }
}
