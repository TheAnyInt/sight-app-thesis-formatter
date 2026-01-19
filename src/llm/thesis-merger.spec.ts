import { mergeThesisResults, ThesisDataWithWarnings } from './thesis-merger';
import { ChunkProcessingResult } from './section-processor';

describe('ThesisMerger', () => {
  describe('mergeThesisResults', () => {
    it('should merge results from multiple chunks', () => {
      const results: ChunkProcessingResult[] = [
        {
          success: true,
          chunkIndex: 0,
          retryCount: 0,
          data: {
            metadata: { title: '测试论文', author_name: '张三' },
            sections: [{ title: '绪论', content: '绪论内容', level: 1 }],
            abstract: '这是摘要',
          },
        },
        {
          success: true,
          chunkIndex: 1,
          retryCount: 0,
          data: {
            sections: [{ title: '方法', content: '方法内容', level: 1 }],
          },
        },
        {
          success: true,
          chunkIndex: 2,
          retryCount: 0,
          data: {
            sections: [{ title: '结论', content: '结论内容', level: 1 }],
            references: '[1] 参考文献',
          },
        },
      ];

      const merged = mergeThesisResults(results);

      expect(merged.metadata.title).toBe('测试论文');
      expect(merged.sections).toHaveLength(3);
      expect(merged.sections[0].title).toBe('绪论');
      expect(merged.sections[1].title).toBe('方法');
      expect(merged.sections[2].title).toBe('结论');
      expect(merged.abstract).toBe('这是摘要');
      expect(merged.references).toBe('[1] 参考文献');
    });

    it('should maintain section order based on chunk index', () => {
      const results: ChunkProcessingResult[] = [
        {
          success: true,
          chunkIndex: 2,
          retryCount: 0,
          data: {
            sections: [{ title: '第三章', content: '内容3', level: 1 }],
          },
        },
        {
          success: true,
          chunkIndex: 0,
          retryCount: 0,
          data: {
            metadata: { title: '论文', author_name: '作者' },
            sections: [{ title: '第一章', content: '内容1', level: 1 }],
          },
        },
        {
          success: true,
          chunkIndex: 1,
          retryCount: 0,
          data: {
            sections: [{ title: '第二章', content: '内容2', level: 1 }],
          },
        },
      ];

      const merged = mergeThesisResults(results);

      expect(merged.sections[0].title).toBe('第一章');
      expect(merged.sections[1].title).toBe('第二章');
      expect(merged.sections[2].title).toBe('第三章');
    });

    it('should select best metadata from multiple sources', () => {
      const results: ChunkProcessingResult[] = [
        {
          success: true,
          chunkIndex: 0,
          retryCount: 0,
          data: {
            metadata: { title: '论文标题', author_name: '' },
            sections: [],
          },
        },
        {
          success: true,
          chunkIndex: 1,
          retryCount: 0,
          data: {
            metadata: { title: '', author_name: '作者姓名', school: '学院' },
            sections: [],
          },
        },
      ];

      const merged = mergeThesisResults(results);

      expect(merged.metadata.title).toBe('论文标题');
      expect(merged.metadata.author_name).toBe('作者姓名');
      expect(merged.metadata.school).toBe('学院');
    });

    it('should handle failed chunks with warnings', () => {
      const results: ChunkProcessingResult[] = [
        {
          success: true,
          chunkIndex: 0,
          retryCount: 0,
          data: {
            metadata: { title: '论文', author_name: '作者' },
            sections: [{ title: '第一章', content: '内容', level: 1 }],
          },
        },
        {
          success: false,
          chunkIndex: 1,
          retryCount: 3,
          error: 'API timeout',
        },
        {
          success: true,
          chunkIndex: 2,
          retryCount: 0,
          data: {
            sections: [{ title: '第三章', content: '内容', level: 1 }],
          },
        },
      ];

      const merged = mergeThesisResults(results);

      expect(merged.warnings).toBeDefined();
      expect(merged.warnings!.length).toBe(1);
      expect(merged.warnings![0]).toContain('Chunk 2');
      expect(merged.sections).toHaveLength(2); // Only successful chunks
    });

    it('should throw error when all chunks fail', () => {
      const results: ChunkProcessingResult[] = [
        {
          success: false,
          chunkIndex: 0,
          retryCount: 3,
          error: 'Error 1',
        },
        {
          success: false,
          chunkIndex: 1,
          retryCount: 3,
          error: 'Error 2',
        },
      ];

      expect(() => mergeThesisResults(results)).toThrow('All chunks failed');
    });

    it('should deduplicate sections with same title and content', () => {
      const results: ChunkProcessingResult[] = [
        {
          success: true,
          chunkIndex: 0,
          retryCount: 0,
          data: {
            metadata: { title: '论文', author_name: '作者' },
            sections: [
              { title: '绪论', content: '相同的绪论内容', level: 1 },
            ],
          },
        },
        {
          success: true,
          chunkIndex: 1,
          retryCount: 0,
          data: {
            sections: [
              { title: '绪论', content: '相同的绪论内容', level: 1 }, // Duplicate
              { title: '方法', content: '方法内容', level: 1 },
            ],
          },
        },
      ];

      const merged = mergeThesisResults(results);

      expect(merged.sections).toHaveLength(2); // 绪论 + 方法, duplicate removed
    });

    it('should merge references from multiple chunks', () => {
      const results: ChunkProcessingResult[] = [
        {
          success: true,
          chunkIndex: 0,
          retryCount: 0,
          data: {
            metadata: { title: '论文', author_name: '作者' },
            sections: [],
            references: '[1] Reference One\n[2] Reference Two',
          },
        },
        {
          success: true,
          chunkIndex: 1,
          retryCount: 0,
          data: {
            sections: [],
            references: '[3] Reference Three',
          },
        },
      ];

      const merged = mergeThesisResults(results);

      expect(merged.references).toContain('Reference One');
      expect(merged.references).toContain('Reference Three');
    });

    it('should handle single chunk result', () => {
      const results: ChunkProcessingResult[] = [
        {
          success: true,
          chunkIndex: 0,
          retryCount: 0,
          data: {
            metadata: { title: '单页论文', author_name: '作者' },
            sections: [{ title: '全文', content: '完整内容', level: 1 }],
            abstract: '摘要',
            references: '参考文献',
          },
        },
      ];

      const merged = mergeThesisResults(results);

      expect(merged.metadata.title).toBe('单页论文');
      expect(merged.sections).toHaveLength(1);
      expect(merged.abstract).toBe('摘要');
      expect(merged.warnings).toBeUndefined();
    });

    it('should extract abstract from whichever chunk has it', () => {
      const results: ChunkProcessingResult[] = [
        {
          success: true,
          chunkIndex: 0,
          retryCount: 0,
          data: {
            metadata: { title: '论文', author_name: '作者' },
            sections: [],
          },
        },
        {
          success: true,
          chunkIndex: 1,
          retryCount: 0,
          data: {
            sections: [],
            abstract: '摘要在第二个chunk中',
            abstract_en: 'English abstract',
          },
        },
      ];

      const merged = mergeThesisResults(results);

      expect(merged.abstract).toBe('摘要在第二个chunk中');
      expect(merged.abstract_en).toBe('English abstract');
    });

    it('should extract keywords from whichever chunk has it', () => {
      const results: ChunkProcessingResult[] = [
        {
          success: true,
          chunkIndex: 0,
          retryCount: 0,
          data: {
            metadata: { title: '论文', author_name: '作者' },
            sections: [],
            keywords: '关键词1、关键词2',
            keywords_en: 'keyword1, keyword2',
          },
        },
      ];

      const merged = mergeThesisResults(results);

      expect(merged.keywords).toBe('关键词1、关键词2');
      expect(merged.keywords_en).toBe('keyword1, keyword2');
    });

    it('should extract acknowledgements from whichever chunk has it', () => {
      const results: ChunkProcessingResult[] = [
        {
          success: true,
          chunkIndex: 0,
          retryCount: 0,
          data: {
            metadata: { title: '论文', author_name: '作者' },
            sections: [],
          },
        },
        {
          success: true,
          chunkIndex: 1,
          retryCount: 0,
          data: {
            sections: [],
            acknowledgements: '感谢我的导师',
          },
        },
      ];

      const merged = mergeThesisResults(results);

      expect(merged.acknowledgements).toBe('感谢我的导师');
    });

    it('should provide default metadata when none provided', () => {
      const results: ChunkProcessingResult[] = [
        {
          success: true,
          chunkIndex: 0,
          retryCount: 0,
          data: {
            sections: [{ title: '章节', content: '内容', level: 1 }],
          },
        },
      ];

      const merged = mergeThesisResults(results);

      expect(merged.metadata).toBeDefined();
      expect(merged.metadata.title).toBe('');
      expect(merged.metadata.author_name).toBe('');
    });
  });
});
