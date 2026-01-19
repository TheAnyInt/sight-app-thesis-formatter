import {
  buildStructureExtractionPrompt,
  parseStructureResponse,
  extractStructureWithRegex,
  DocumentStructure,
} from './structure-extractor';

describe('StructureExtractor', () => {
  describe('buildStructureExtractionPrompt', () => {
    it('should include the content in the prompt', () => {
      const content = '这是一篇测试论文的内容';
      const prompt = buildStructureExtractionPrompt(content);

      expect(prompt).toContain(content);
      expect(prompt).toContain('只提取文档结构');
      expect(prompt).toContain('JSON');
    });

    it('should include instructions for section extraction', () => {
      const content = '第一章 绪论\n这是绪论内容';
      const prompt = buildStructureExtractionPrompt(content);

      expect(prompt).toContain('startPos');
      expect(prompt).toContain('endPos');
      expect(prompt).toContain('level');
    });
  });

  describe('parseStructureResponse', () => {
    it('should parse a valid structure response', () => {
      const response = JSON.stringify({
        metadata: {
          title: '测试论文',
          author: '张三',
          school: '计算机学院',
        },
        sections: [
          { title: '绪论', level: 1, startPos: 100, endPos: 500 },
          { title: '研究背景', level: 2, startPos: 150, endPos: 300 },
        ],
        abstractRange: { start: 0, end: 100 },
        referencesRange: { start: 500, end: 600 },
      });

      const structure = parseStructureResponse(response);

      expect(structure.metadata.title).toBe('测试论文');
      expect(structure.metadata.author).toBe('张三');
      expect(structure.sections).toHaveLength(2);
      expect(structure.sections[0].title).toBe('绪论');
      expect(structure.sections[0].level).toBe(1);
      expect(structure.abstractRange?.start).toBe(0);
      expect(structure.referencesRange?.start).toBe(500);
    });

    it('should handle missing optional fields', () => {
      const response = JSON.stringify({
        metadata: {},
        sections: [],
      });

      const structure = parseStructureResponse(response);

      expect(structure.metadata.title).toBeUndefined();
      expect(structure.sections).toHaveLength(0);
      expect(structure.abstractRange).toBeUndefined();
    });

    it('should normalize invalid level values to 1', () => {
      const response = JSON.stringify({
        metadata: {},
        sections: [{ title: '测试', level: 5, startPos: 0, endPos: 100 }],
      });

      const structure = parseStructureResponse(response);

      expect(structure.sections[0].level).toBe(1);
    });

    it('should throw error for invalid JSON', () => {
      expect(() => parseStructureResponse('invalid json')).toThrow();
    });

    it('should handle negative positions by normalizing to 0', () => {
      const response = JSON.stringify({
        metadata: {},
        sections: [{ title: '测试', level: 1, startPos: -10, endPos: 100 }],
      });

      const structure = parseStructureResponse(response);

      expect(structure.sections[0].startPos).toBe(0);
    });
  });

  describe('extractStructureWithRegex', () => {
    it('should extract Chinese chapter headings', () => {
      const content = `
摘要
这是摘要内容

第一章 绪论
这是绪论的内容

第二章 相关工作
这是相关工作的内容

参考文献
[1] 参考文献1
`;
      const structure = extractStructureWithRegex(content);

      expect(structure.sections.length).toBeGreaterThan(0);
      expect(structure.abstractRange).toBeDefined();
      expect(structure.referencesRange).toBeDefined();
    });

    it('should extract numbered section headings', () => {
      const content = `
1 Introduction
This is the introduction.

1.1 Background
This is the background.

1.2 Motivation
This is the motivation.

2 Related Work
This is related work.
`;
      const structure = extractStructureWithRegex(content);

      expect(structure.sections.length).toBeGreaterThan(0);
    });

    it('should detect abstract section', () => {
      const content = `
摘要
这是中文摘要的内容，包含了论文的主要贡献。

关键词：机器学习、深度学习

第一章 绪论
`;
      const structure = extractStructureWithRegex(content);

      expect(structure.abstractRange).toBeDefined();
      expect(structure.abstractRange!.start).toBeGreaterThanOrEqual(0);
    });

    it('should detect references section', () => {
      const content = `
第五章 结论
这是结论内容。

参考文献
[1] Smith, J. (2020). Title of Paper.
[2] Zhang, L. (2021). Another Paper.
`;
      const structure = extractStructureWithRegex(content);

      expect(structure.referencesRange).toBeDefined();
    });

    it('should detect acknowledgements section', () => {
      const content = `
结论
这是结论。

致谢
感谢我的导师和家人。

参考文献
[1] Reference
`;
      const structure = extractStructureWithRegex(content);

      expect(structure.acknowledgementsRange).toBeDefined();
    });

    it('should handle empty content', () => {
      const structure = extractStructureWithRegex('');

      expect(structure.sections).toHaveLength(0);
      expect(structure.metadata).toBeDefined();
    });

    it('should handle content without clear structure', () => {
      const content = '这是一段没有明确结构的文本内容，没有章节标题。';

      const structure = extractStructureWithRegex(content);

      expect(structure.sections).toHaveLength(0);
    });
  });
});
