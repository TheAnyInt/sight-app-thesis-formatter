import { Injectable, Logger } from '@nestjs/common';
import { ExtractionService } from '../document/extraction.service';
import { TemplateService } from '../document/template.service';
import { LlmService } from '../llm/llm.service';
import { ReferenceFormatterService } from '../reference/reference-formatter.service';

@Injectable()
export class ThesisService {
  private readonly logger = new Logger(ThesisService.name);

  constructor(
    private readonly extractionService: ExtractionService,
    private readonly templateService: TemplateService,
    private readonly llmService: LlmService,
    private readonly referenceFormatterService: ReferenceFormatterService,
  ) {}

  async processThesis(fileBuffer: Buffer): Promise<Buffer> {
    this.logger.log('Starting thesis processing pipeline...');

    // Step 1: Extract text and images from uploaded document
    this.logger.log('Step 1: Extracting content from document...');
    const { text: extractedText, images } =
      await this.extractionService.extractContent(fileBuffer);

    if (!extractedText || extractedText.length === 0) {
      throw new Error('No text content found in the uploaded document');
    }

    this.logger.log(
      `Extracted ${extractedText.length} characters and ${images.size} images`,
    );

    // Step 2: Parse content with LLM to extract structured data
    this.logger.log('Step 2: Parsing content with LLM...');
    const thesisData = await this.llmService.parseThesisContent(extractedText);

    this.logger.log('Parsed thesis data fields:');
    Object.entries(thesisData).forEach(([key, value]) => {
      const preview =
        typeof value === 'string' && value.length > 50
          ? `${value.substring(0, 50)}...`
          : value;
      this.logger.debug(`  ${key}: ${preview || '(empty)'}`);
    });

    // Step 3: Format references according to GB/T 7714-2015
    if (thesisData.references && thesisData.references.length > 0) {
      this.logger.log('Step 3: Formatting references (GB/T 7714-2015)...');
      thesisData.references =
        await this.referenceFormatterService.parseAndFormatReferences(
          thesisData.references,
        );
      this.logger.log('References formatted successfully');
    }

    // Step 4: Fill template with extracted data and images
    this.logger.log('Step 4: Filling template with extracted data...');
    const outputBuffer = await this.templateService.fillTemplate(
      thesisData,
      images,
    );

    this.logger.log('Thesis processing completed successfully');
    return outputBuffer;
  }
}
