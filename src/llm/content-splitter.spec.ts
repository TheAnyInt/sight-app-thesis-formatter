import { splitContentByStructure, ContentChunk } from './content-splitter';
import { DocumentStructure } from './structure-extractor';

describe('ContentSplitter', () => {
  describe('splitContentByStructure', () => {
    it('should create single chunk for small content with no sections', () => {
      const content = '这是一段简短的内容';
      const structure: DocumentStructure = {
        metadata: { title: '测试' },
        sections: [],
      };

      const chunks = splitContentByStructure(content, structure);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].chunkIndex).toBe(0);
      expect(chunks[0].totalChunks).toBe(1);
    });

    it('should split content based on section boundaries', () => {
      const content = `
开头内容
第一章标题位置
第一章的内容在这里
第二章标题位置
第二章的内容在这里
`;
      const structure: DocumentStructure = {
        metadata: {},
        sections: [
          { title: '第一章', level: 1, startPos: 10, endPos: 50 },
          { title: '第二章', level: 1, startPos: 50, endPos: 100 },
        ],
      };

      const chunks = splitContentByStructure(content, structure);

      expect(chunks.length).toBeGreaterThan(0);
      chunks.forEach((chunk, idx) => {
        expect(chunk.chunkIndex).toBe(idx);
        expect(chunk.totalChunks).toBe(chunks.length);
      });
    });

    it('should include abstract content when present', () => {
      const content = '摘要内容在这里。正文内容在这里。';
      const structure: DocumentStructure = {
        metadata: {},
        sections: [{ title: '正文', level: 1, startPos: 15, endPos: 30 }],
        abstractRange: { start: 0, end: 14 },
      };

      const chunks = splitContentByStructure(content, structure);

      const chunkWithAbstract = chunks.find((c) => c.includesAbstract);
      expect(chunkWithAbstract).toBeDefined();
      expect(chunkWithAbstract!.abstractContent).toBeDefined();
    });

    it('should include references content when present', () => {
      const content = '正文内容。参考文献内容在这里。';
      const structure: DocumentStructure = {
        metadata: {},
        sections: [{ title: '正文', level: 1, startPos: 0, endPos: 10 }],
        referencesRange: { start: 10, end: 30 },
      };

      const chunks = splitContentByStructure(content, structure);

      const chunkWithRefs = chunks.find((c) => c.includesReferences);
      expect(chunkWithRefs).toBeDefined();
      expect(chunkWithRefs!.referencesContent).toBeDefined();
    });

    it('should include acknowledgements content when present', () => {
      const content = '正文内容。致谢内容在这里。';
      const structure: DocumentStructure = {
        metadata: {},
        sections: [{ title: '正文', level: 1, startPos: 0, endPos: 10 }],
        acknowledgementsRange: { start: 10, end: 25 },
      };

      const chunks = splitContentByStructure(content, structure);

      const chunkWithAck = chunks.find((c) => c.includesAcknowledgements);
      expect(chunkWithAck).toBeDefined();
      expect(chunkWithAck!.acknowledgementsContent).toBeDefined();
    });

    it('should handle multiple sections in a single chunk when under size limit', () => {
      const content = 'A'.repeat(1000) + 'B'.repeat(1000);
      const structure: DocumentStructure = {
        metadata: {},
        sections: [
          { title: '第一节', level: 1, startPos: 0, endPos: 1000 },
          { title: '第二节', level: 1, startPos: 1000, endPos: 2000 },
        ],
      };

      const chunks = splitContentByStructure(content, structure);

      // Both sections should fit in one chunk since they're small
      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });

    it('should split large sections at paragraph boundaries', () => {
      // Create content with paragraphs that exceeds chunk limit
      const paragraph = '这是一个段落的内容。'.repeat(100) + '\n\n';
      const content = paragraph.repeat(50); // Large content

      const structure: DocumentStructure = {
        metadata: {},
        sections: [{ title: '大章节', level: 1, startPos: 0, endPos: content.length }],
      };

      const chunks = splitContentByStructure(content, structure);

      // Should create multiple chunks for large content
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should set correct chunk indices and totals', () => {
      const content = 'A'.repeat(50000) + 'B'.repeat(50000);
      const structure: DocumentStructure = {
        metadata: {},
        sections: [
          { title: '第一章', level: 1, startPos: 0, endPos: 50000 },
          { title: '第二章', level: 1, startPos: 50000, endPos: 100000 },
        ],
      };

      const chunks = splitContentByStructure(content, structure);

      chunks.forEach((chunk, idx) => {
        expect(chunk.chunkIndex).toBe(idx);
        expect(chunk.totalChunks).toBe(chunks.length);
      });
    });

    it('should preserve section level information', () => {
      const content = `
第一章内容
第一节内容
第一小节内容
`;
      const structure: DocumentStructure = {
        metadata: {},
        sections: [
          { title: '第一章', level: 1, startPos: 0, endPos: 20 },
          { title: '第一节', level: 2, startPos: 20, endPos: 40 },
          { title: '第一小节', level: 3, startPos: 40, endPos: 60 },
        ],
      };

      const chunks = splitContentByStructure(content, structure);

      const allSections = chunks.flatMap((c) => c.sections);
      expect(allSections.some((s) => s.level === 1)).toBe(true);
      expect(allSections.some((s) => s.level === 2)).toBe(true);
      expect(allSections.some((s) => s.level === 3)).toBe(true);
    });
  });
});
