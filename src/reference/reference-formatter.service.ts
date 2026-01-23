import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  Reference,
  ReferenceType,
  REFERENCE_TYPE_MARKERS,
} from './dto/reference.dto';

@Injectable()
export class ReferenceFormatterService {
  private readonly logger = new Logger(ReferenceFormatterService.name);
  private readonly openai: OpenAI;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const baseURL = this.configService.get<string>('OPENAI_BASE_URL');

    this.openai = new OpenAI({
      apiKey,
      baseURL: baseURL || undefined,
    });

    this.model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o';
  }

  async parseAndFormatReferences(rawText: string): Promise<string> {
    if (!rawText || rawText.trim().length === 0) {
      return '';
    }

    this.logger.log('Parsing references with LLM...');

    try {
      const references = await this.parseReferences(rawText);
      this.logger.log(`Parsed ${references.length} references`);

      const formatted = this.formatAllReferences(references);
      return formatted;
    } catch (error) {
      this.logger.error('Failed to parse references', error);
      return rawText;
    }
  }

  private async parseReferences(rawText: string): Promise<Reference[]> {
    const prompt = this.buildParsePrompt(rawText);

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `你是一个专业的参考文献解析助手，擅长处理各种格式的参考文献，包括：
- 标准学术格式 (GB/T 7714, APA, MLA, Chicago 等)
- 非标准/随意格式
- 中英文混合格式

你的核心能力：
1. 识别文本中的每一条参考文献（通常按行、编号或段落分隔）
2. 从每条参考文献中提取尽可能多的结构化信息
3. 即使格式不标准或信息不完整，也要尽力解析
4. 始终返回有效的 JSON

重要：每一行或每一段通常代表一条独立的参考文献，请分别解析。`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const resultText = response.choices[0]?.message?.content;
    if (!resultText) {
      throw new Error('Empty response from LLM');
    }

    const parsed = JSON.parse(resultText);
    const references = parsed.references || parsed;

    return Array.isArray(references) ? references : [];
  }

  private buildParsePrompt(rawText: string): string {
    return `请将以下参考文献文本解析为结构化 JSON。返回格式为 {"references": [...]}。

## 输入格式说明
参考文献可能是以下任意格式：
- 标准格式: "[1] 作者. 标题[J]. 期刊, 年, 卷(期): 页码."
- 编号格式: "1. 作者, 标题, 期刊 2020"
- 无编号格式: "作者, 标题, 出版信息"
- URL格式: "https://example.com/resource"
- 随意格式: "Smith et al., Some Paper Title, Journal 2020"
- 混合格式: 以上格式的任意组合

## 解析规则
1. 每行或每个编号项通常是一条独立的参考文献，请分别解析
2. 如果无法确定某字段，请省略该字段（不要猜测）
3. 作者名可能是多种格式: "Smith, J." 或 "张三" 或 "Smith et al." 或 "Wang L, Li M"
4. 年份可能出现在任意位置，如 "(2020)" 或 "2020年" 或末尾 "2020"
5. 即使信息不完整，也要尽力提取已有信息

## 输出字段
- type: "journal" | "book" | "conference" | "thesis" | "website" | "standard" | "other"
- authors: 作者数组（字符串数组）
- title: 标题
- journal: 期刊名（期刊文章适用）
- publisher: 出版社（图书适用）
- publisherLocation: 出版地（图书适用）
- year: 年份
- volume: 卷号
- issue: 期号
- pages: 页码
- doi: DOI
- url: URL（网络资源适用）
- accessDate: 访问日期（网络资源适用）
- conferenceName: 会议名称（会议论文适用）
- institution: 学位授予单位（学位论文适用）
- standardNumber: 标准编号（标准适用）

## 示例输入
Smith J, Wang L. Deep Learning for NLP. Nature 2020, 15(3): 100-110
张三. 机器学习研究[D]. 北京大学, 2019
https://pytorch.org/docs/

## 示例输出
{"references": [
  {"type": "journal", "authors": ["Smith J", "Wang L"], "title": "Deep Learning for NLP", "journal": "Nature", "year": "2020", "volume": "15", "issue": "3", "pages": "100-110"},
  {"type": "thesis", "authors": ["张三"], "title": "机器学习研究", "institution": "北京大学", "year": "2019"},
  {"type": "website", "title": "PyTorch Documentation", "url": "https://pytorch.org/docs/"}
]}

## 待解析文本
${rawText}`;
  }

  formatAllReferences(references: Reference[]): string {
    return references
      .map((ref, index) => this.formatReference(ref, index + 1))
      .join('\n');
  }

  private formatReference(ref: Reference, index: number): string {
    const marker = REFERENCE_TYPE_MARKERS[ref.type] || 'Z';
    const authors = this.formatAuthors(ref.authors);

    switch (ref.type) {
      case 'journal':
        return this.formatJournal(ref, index, authors, marker);
      case 'book':
        return this.formatBook(ref, index, authors, marker);
      case 'conference':
        return this.formatConference(ref, index, authors, marker);
      case 'thesis':
        return this.formatThesis(ref, index, authors, marker);
      case 'website':
        return this.formatWebsite(ref, index, authors, marker);
      case 'standard':
        return this.formatStandard(ref, index, marker);
      default:
        return this.formatOther(ref, index, authors, marker);
    }
  }

  private formatAuthors(authors: string[]): string {
    if (!authors || authors.length === 0) {
      return '';
    }
    if (authors.length <= 3) {
      return authors.join(', ');
    }
    return `${authors.slice(0, 3).join(', ')}, 等`;
  }

  // [序号] 作者. 题名[J]. 刊名, 年, 卷(期): 页码.
  private formatJournal(
    ref: Reference,
    index: number,
    authors: string,
    marker: string,
  ): string {
    let result = `[${index}] ${authors}. ${ref.title}[${marker}]. ${ref.journal || ''}`;

    if (ref.year) {
      result += `, ${ref.year}`;
    }
    if (ref.volume) {
      result += `, ${ref.volume}`;
      if (ref.issue) {
        result += `(${ref.issue})`;
      }
    }
    if (ref.pages) {
      result += `: ${ref.pages}`;
    }
    result += '.';

    if (ref.doi) {
      result += ` DOI: ${ref.doi}.`;
    }

    return result;
  }

  // [序号] 作者. 书名[M]. 出版地: 出版社, 年: 页码.
  private formatBook(
    ref: Reference,
    index: number,
    authors: string,
    marker: string,
  ): string {
    let result = `[${index}] ${authors}. ${ref.title}[${marker}].`;

    if (ref.publisherLocation) {
      result += ` ${ref.publisherLocation}:`;
    }
    if (ref.publisher) {
      result += ` ${ref.publisher}`;
    }
    if (ref.year) {
      result += `, ${ref.year}`;
    }
    if (ref.pages) {
      result += `: ${ref.pages}`;
    }
    result += '.';

    return result;
  }

  // [序号] 作者. 题名[C]//会议名. 出版地: 出版者, 年: 页码.
  private formatConference(
    ref: Reference,
    index: number,
    authors: string,
    marker: string,
  ): string {
    let result = `[${index}] ${authors}. ${ref.title}[${marker}]`;

    if (ref.conferenceName) {
      result += `//${ref.conferenceName}`;
    }
    result += '.';

    if (ref.publisherLocation) {
      result += ` ${ref.publisherLocation}:`;
    }
    if (ref.publisher) {
      result += ` ${ref.publisher}`;
    }
    if (ref.year) {
      result += `, ${ref.year}`;
    }
    if (ref.pages) {
      result += `: ${ref.pages}`;
    }
    result += '.';

    return result;
  }

  // [序号] 作者. 题名[D]. 保存地: 保存单位, 年.
  private formatThesis(
    ref: Reference,
    index: number,
    authors: string,
    marker: string,
  ): string {
    let result = `[${index}] ${authors}. ${ref.title}[${marker}].`;

    if (ref.publisherLocation) {
      result += ` ${ref.publisherLocation}:`;
    }
    if (ref.institution) {
      result += ` ${ref.institution}`;
    }
    if (ref.year) {
      result += `, ${ref.year}`;
    }
    result += '.';

    return result;
  }

  // [序号] 作者. 题名[EB/OL]. (发布日期)[引用日期]. URL.
  private formatWebsite(
    ref: Reference,
    index: number,
    authors: string,
    marker: string,
  ): string {
    let result = `[${index}] ${authors}. ${ref.title}[${marker}].`;

    if (ref.year) {
      result += ` (${ref.year})`;
    }
    if (ref.accessDate) {
      result += `[${ref.accessDate}]`;
    }
    result += '.';

    if (ref.url) {
      result += ` ${ref.url}.`;
    }

    return result;
  }

  // [序号] 标准编号, 标准名称[S].
  private formatStandard(
    ref: Reference,
    index: number,
    marker: string,
  ): string {
    let result = `[${index}]`;

    if (ref.standardNumber) {
      result += ` ${ref.standardNumber},`;
    }
    result += ` ${ref.title}[${marker}].`;

    return result;
  }

  private formatOther(
    ref: Reference,
    index: number,
    authors: string,
    marker: string,
  ): string {
    let result = `[${index}] ${authors}. ${ref.title}[${marker}].`;

    if (ref.year) {
      result += ` ${ref.year}.`;
    }

    return result;
  }
}
