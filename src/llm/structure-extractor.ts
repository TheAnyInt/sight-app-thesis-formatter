import { Logger } from '@nestjs/common';

/**
 * Document structure extracted from Phase 1 analysis
 */
export interface DocumentStructure {
  metadata: {
    title?: string;
    author?: string;
    school?: string;
    major?: string;
    supervisor?: string;
    date?: string;
  };
  sections: Array<{
    title: string;
    level: 1 | 2 | 3;
    startPos: number;
    endPos: number;
  }>;
  abstractRange?: { start: number; end: number };
  referencesRange?: { start: number; end: number };
  acknowledgementsRange?: { start: number; end: number };
}

/**
 * Builds the prompt for structure extraction (Phase 1)
 * This prompt only requests document outline, not content
 */
export function buildStructureExtractionPrompt(content: string): string {
  return `分析以下学术论文，**只提取文档结构**（不要提取内容本身）。

你需要识别：
1. 基本元数据（标题、作者等）
2. 所有章节标题及其在原文中的字符位置
3. 摘要、参考文献、致谢的位置范围

输出 JSON 格式：

{
  "metadata": {
    "title": "论文标题",
    "author": "作者姓名",
    "school": "学院",
    "major": "专业",
    "supervisor": "指导教师",
    "date": "日期"
  },
  "sections": [
    {"title": "绪论", "level": 1, "startPos": 1234, "endPos": 5678},
    {"title": "研究背景", "level": 2, "startPos": 1500, "endPos": 2500},
    {"title": "相关工作", "level": 1, "startPos": 5678, "endPos": 9000}
  ],
  "abstractRange": {"start": 100, "end": 800},
  "referencesRange": {"start": 45000, "end": 48000},
  "acknowledgementsRange": {"start": 48000, "end": 49000}
}

**重要说明：**
1. startPos 和 endPos 是字符在原文中的大致位置（从0开始计数）
2. **章节标题只保留纯文字内容，去掉编号前缀**：
   - "第一章 绪论" → title: "绪论"
   - "1.1 研究背景" → title: "研究背景"
   - "Chapter 1 Introduction" → title: "Introduction"
3. level: 1 表示一级标题（章），2 表示二级标题（节），3 表示三级标题
4. 如果某个范围不存在，设为 null
5. sections 数组应包含所有正文章节，不包含摘要、参考文献、致谢

论文内容：
${content}`;
}

/**
 * Parses the LLM response for structure extraction
 */
export function parseStructureResponse(responseText: string): DocumentStructure {
  const logger = new Logger('StructureExtractor');

  try {
    const parsed = JSON.parse(responseText);

    const structure: DocumentStructure = {
      metadata: {
        title: parsed.metadata?.title?.trim() || undefined,
        author: parsed.metadata?.author?.trim() || undefined,
        school: parsed.metadata?.school?.trim() || undefined,
        major: parsed.metadata?.major?.trim() || undefined,
        supervisor: parsed.metadata?.supervisor?.trim() || undefined,
        date: parsed.metadata?.date?.trim() || undefined,
      },
      sections: [],
    };

    // Parse sections
    if (Array.isArray(parsed.sections)) {
      for (const sec of parsed.sections) {
        if (sec.title && typeof sec.startPos === 'number') {
          structure.sections.push({
            title: sec.title.trim(),
            level: [1, 2, 3].includes(sec.level) ? sec.level : 1,
            startPos: Math.max(0, sec.startPos),
            endPos: Math.max(sec.startPos, sec.endPos || sec.startPos),
          });
        }
      }
    }

    // Parse special section ranges
    if (parsed.abstractRange && typeof parsed.abstractRange.start === 'number') {
      structure.abstractRange = {
        start: Math.max(0, parsed.abstractRange.start),
        end: Math.max(parsed.abstractRange.start, parsed.abstractRange.end || parsed.abstractRange.start),
      };
    }

    if (parsed.referencesRange && typeof parsed.referencesRange.start === 'number') {
      structure.referencesRange = {
        start: Math.max(0, parsed.referencesRange.start),
        end: Math.max(parsed.referencesRange.start, parsed.referencesRange.end || parsed.referencesRange.start),
      };
    }

    if (parsed.acknowledgementsRange && typeof parsed.acknowledgementsRange.start === 'number') {
      structure.acknowledgementsRange = {
        start: Math.max(0, parsed.acknowledgementsRange.start),
        end: Math.max(
          parsed.acknowledgementsRange.start,
          parsed.acknowledgementsRange.end || parsed.acknowledgementsRange.start,
        ),
      };
    }

    logger.log(`Structure extracted: ${structure.sections.length} sections found`);
    return structure;
  } catch (error) {
    logger.error('Failed to parse structure response', error);
    throw new Error(`Structure parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fallback: Extract structure using regex patterns when LLM fails
 */
export function extractStructureWithRegex(content: string): DocumentStructure {
  const logger = new Logger('StructureExtractor');
  logger.warn('Using regex fallback for structure extraction');

  const structure: DocumentStructure = {
    metadata: {},
    sections: [],
  };

  // Common chapter/section patterns for Chinese academic papers
  const patterns = [
    // Chinese patterns: 第X章, 第一章, etc.
    /^(第[一二三四五六七八九十\d]+章)\s*(.+?)$/gm,
    // Section patterns: X.Y, X.Y.Z
    /^(\d+(?:\.\d+)*)\s+(.+?)$/gm,
    // English patterns: Chapter X
    /^(Chapter\s+\d+)\s*[:\.]?\s*(.+?)$/gim,
    // Generic heading patterns (lines that are short and possibly in caps)
    /^([一二三四五六七八九十]+、)\s*(.+?)$/gm,
  ];

  // Find all potential headings
  const headings: Array<{ match: string; title: string; pos: number; level: 1 | 2 | 3 }> = [];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const prefix = match[1];
      const title = match[2]?.trim() || match[1]?.trim();
      const pos = match.index;

      // Determine level based on prefix
      let level: 1 | 2 | 3 = 1;
      if (/^\d+\.\d+\.\d+/.test(prefix)) {
        level = 3;
      } else if (/^\d+\.\d+/.test(prefix)) {
        level = 2;
      } else if (/^第.+章/.test(prefix) || /^Chapter/i.test(prefix)) {
        level = 1;
      }

      headings.push({ match: match[0], title, pos, level });
    }
  }

  // Sort by position
  headings.sort((a, b) => a.pos - b.pos);

  // Convert to sections with estimated end positions
  for (let i = 0; i < headings.length; i++) {
    const current = headings[i];
    const next = headings[i + 1];

    structure.sections.push({
      title: current.title,
      level: current.level,
      startPos: current.pos,
      endPos: next ? next.pos - 1 : content.length,
    });
  }

  // Try to find special sections
  const abstractMatch = content.match(/摘\s*要|Abstract/i);
  if (abstractMatch && abstractMatch.index !== undefined) {
    const startPos = abstractMatch.index;
    // Find the end by looking for next section or keywords
    const endMatch = content.slice(startPos + 100).match(/关键词|Keywords|目录|第[一二三四五六七八九十\d]+章|Chapter\s+\d+/i);
    structure.abstractRange = {
      start: startPos,
      end: endMatch ? startPos + 100 + endMatch.index! : Math.min(startPos + 5000, content.length),
    };
  }

  const referencesMatch = content.match(/参考文献|References|Bibliography/i);
  if (referencesMatch && referencesMatch.index !== undefined) {
    structure.referencesRange = {
      start: referencesMatch.index,
      end: content.length,
    };
  }

  const ackMatch = content.match(/致\s*谢|Acknowledgements?/i);
  if (ackMatch && ackMatch.index !== undefined) {
    const startPos = ackMatch.index;
    // End at references or end of document
    const endPos = structure.referencesRange?.start || content.length;
    structure.acknowledgementsRange = {
      start: startPos,
      end: Math.min(endPos, startPos + 10000),
    };
  }

  logger.log(`Regex extraction: ${structure.sections.length} sections found`);
  return structure;
}
