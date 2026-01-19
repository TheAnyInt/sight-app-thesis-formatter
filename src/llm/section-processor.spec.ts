import {
  buildChunkPrompt,
  parseChunkResponse,
  delay,
  calculateRetryDelay,
  RETRY_CONFIG,
} from './section-processor';
import { ContentChunk } from './content-splitter';

describe('SectionProcessor', () => {
  describe('buildChunkPrompt', () => {
    it('should include section content in the prompt', () => {
      const chunk: ContentChunk = {
        sections: [{ title: '绪论', level: 1, content: '这是绪论的内容' }],
        chunkIndex: 0,
        totalChunks: 1,
      };

      const prompt = buildChunkPrompt(chunk, false, '');

      expect(prompt).toContain('绪论');
      expect(prompt).toContain('这是绪论的内容');
    });

    it('should include metadata instructions for first chunk', () => {
      const chunk: ContentChunk = {
        sections: [{ title: '第一章', level: 1, content: '内容' }],
        chunkIndex: 0,
        totalChunks: 2,
      };

      const prompt = buildChunkPrompt(chunk, false, '');

      expect(prompt).toContain('"title"');
      expect(prompt).toContain('"author_name"');
    });

    it('should skip metadata instructions for non-first chunks', () => {
      const chunk: ContentChunk = {
        sections: [{ title: '第二章', level: 1, content: '内容' }],
        chunkIndex: 1,
        totalChunks: 2,
      };

      const prompt = buildChunkPrompt(chunk, false, '');

      expect(prompt).toContain('"metadata": {}');
    });

    it('should include figure instructions when figures are present', () => {
      const chunk: ContentChunk = {
        sections: [{ title: '第一章', level: 1, content: '内容 [FIGURE:pdfimg1]' }],
        chunkIndex: 0,
        totalChunks: 1,
      };

      const prompt = buildChunkPrompt(chunk, true, 'pdfimg1, pdfimg2');

      expect(prompt).toContain('pdfimg1, pdfimg2');
      expect(prompt).toContain('图片处理说明');
    });

    it('should include abstract instructions when chunk has abstract', () => {
      const chunk: ContentChunk = {
        sections: [],
        chunkIndex: 0,
        totalChunks: 1,
        includesAbstract: true,
        abstractContent: '这是摘要内容',
      };

      const prompt = buildChunkPrompt(chunk, false, '');

      expect(prompt).toContain('摘要');
      expect(prompt).toContain('"abstract"');
    });

    it('should include references instructions when chunk has references', () => {
      const chunk: ContentChunk = {
        sections: [],
        chunkIndex: 0,
        totalChunks: 1,
        includesReferences: true,
        referencesContent: '[1] 参考文献',
      };

      const prompt = buildChunkPrompt(chunk, false, '');

      expect(prompt).toContain('参考文献');
      expect(prompt).toContain('"references"');
    });

    it('should include chunk position context for multi-chunk processing', () => {
      const chunk: ContentChunk = {
        sections: [{ title: '第三章', level: 1, content: '内容' }],
        chunkIndex: 2,
        totalChunks: 5,
      };

      const prompt = buildChunkPrompt(chunk, false, '');

      expect(prompt).toContain('3/5');
    });
  });

  describe('parseChunkResponse', () => {
    it('should parse complete response with all fields', () => {
      const response = JSON.stringify({
        metadata: {
          title: '测试论文',
          author_name: '张三',
          school: '计算机学院',
        },
        sections: [
          { title: '绪论', content: '绪论内容', level: 1 },
          { title: '背景', content: '背景内容', level: 2 },
        ],
        abstract: '这是摘要',
        keywords: '关键词1、关键词2',
        references: '[1] 参考文献',
      });

      const data = parseChunkResponse(response, 0);

      expect(data.metadata?.title).toBe('测试论文');
      expect(data.sections).toHaveLength(2);
      expect(data.abstract).toBe('这是摘要');
      expect(data.keywords).toBe('关键词1、关键词2');
    });

    it('should handle response with only sections', () => {
      const response = JSON.stringify({
        metadata: {},
        sections: [{ title: '第二章', content: '第二章内容', level: 1 }],
      });

      const data = parseChunkResponse(response, 1);

      expect(data.sections).toHaveLength(1);
      expect(data.sections![0].title).toBe('第二章');
    });

    it('should normalize invalid level values', () => {
      const response = JSON.stringify({
        sections: [{ title: '测试', content: '内容', level: 99 }],
      });

      const data = parseChunkResponse(response, 0);

      expect(data.sections![0].level).toBe(1);
    });

    it('should handle empty sections array', () => {
      const response = JSON.stringify({
        sections: [],
        abstract: '只有摘要',
      });

      const data = parseChunkResponse(response, 0);

      expect(data.sections).toHaveLength(0);
      expect(data.abstract).toBe('只有摘要');
    });

    it('should trim whitespace from all string fields', () => {
      const response = JSON.stringify({
        metadata: {
          title: '  标题  ',
          author_name: '  作者  ',
        },
        sections: [{ title: '  章节  ', content: '  内容  ', level: 1 }],
        abstract: '  摘要  ',
      });

      const data = parseChunkResponse(response, 0);

      expect(data.metadata?.title).toBe('标题');
      expect(data.sections![0].title).toBe('章节');
      expect(data.abstract).toBe('摘要');
    });

    it('should throw error for invalid JSON', () => {
      expect(() => parseChunkResponse('invalid json', 0)).toThrow();
    });
  });

  describe('delay', () => {
    it('should delay for specified milliseconds', async () => {
      const start = Date.now();
      await delay(100);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some tolerance
    });
  });

  describe('calculateRetryDelay', () => {
    it('should return base delay for first retry', () => {
      const delayMs = calculateRetryDelay(0);

      expect(delayMs).toBe(RETRY_CONFIG.baseDelayMs);
    });

    it('should use exponential backoff', () => {
      const delay0 = calculateRetryDelay(0);
      const delay1 = calculateRetryDelay(1);
      const delay2 = calculateRetryDelay(2);

      expect(delay1).toBe(delay0 * 2);
      expect(delay2).toBe(delay0 * 4);
    });

    it('should cap delay at maxDelayMs', () => {
      const delayMs = calculateRetryDelay(10); // Large retry count

      expect(delayMs).toBeLessThanOrEqual(RETRY_CONFIG.maxDelayMs);
    });
  });

  describe('RETRY_CONFIG', () => {
    it('should have reasonable default values', () => {
      expect(RETRY_CONFIG.maxRetries).toBeGreaterThanOrEqual(2);
      expect(RETRY_CONFIG.maxRetries).toBeLessThanOrEqual(5);
      expect(RETRY_CONFIG.baseDelayMs).toBeGreaterThanOrEqual(1000);
      expect(RETRY_CONFIG.maxDelayMs).toBeGreaterThanOrEqual(RETRY_CONFIG.baseDelayMs);
    });
  });
});
