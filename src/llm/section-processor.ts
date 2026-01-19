import { Logger } from '@nestjs/common';
import { ContentChunk } from './content-splitter';
import { ThesisData, Section, ThesisMetadata } from '../thesis/dto/thesis-data.dto';

const logger = new Logger('SectionProcessor');

/**
 * Result from processing a single chunk
 */
export interface ChunkProcessingResult {
  success: boolean;
  chunkIndex: number;
  data?: Partial<ThesisData>;
  error?: string;
  retryCount: number;
}

/**
 * Build the prompt for processing a single content chunk
 */
export function buildChunkPrompt(chunk: ContentChunk, hasFigureMarkers: boolean, figureIdList: string): string {
  const isFirstChunk = chunk.chunkIndex === 0;
  const hasOnlySections = chunk.sections.length > 0 && !chunk.includesAbstract && !chunk.includesReferences && !chunk.includesAcknowledgements;

  let contextInfo = '';
  if (chunk.totalChunks > 1) {
    contextInfo = `\n**注意：这是文档的第 ${chunk.chunkIndex + 1}/${chunk.totalChunks} 部分。**\n`;
    if (!isFirstChunk) {
      contextInfo += '- 不需要再次提取 metadata，返回空对象即可\n';
    }
  }

  const figureInstructions = hasFigureMarkers
    ? `
**图片处理说明：**
文本中可能包含图片标记: ${figureIdList}
每个 [FIGURE:xxxX] 标记（如 [FIGURE:docximg1]）表示该位置有一张图片。
**重要：只处理上述列出的图片ID，不要创建其他图片引用！必须使用原始的图片ID！**

请在对应章节的 content 中将这些标记转换为 LaTeX 格式（保留原始图片ID）：

例如 [FIGURE:docximg1] 应转换为：
\\\\begin{figure}[H]
    \\\\centering
    \\\\includegraphics[width=0.8\\\\textwidth]{docximg1.png}
    \\\\caption{根据上下文推断的图片描述}
    \\\\label{fig:docximg1}
\\\\end{figure}

注意：
- 只能使用以下图片ID: ${figureIdList}
- 必须保留原始的图片ID（如 docximg1, pdfimg2 等），不要修改为其他名称
- 不要创建任何不在上述列表中的图片引用
- 根据图片前后的文本内容，为每张图片生成合适的中文标题作为 caption
- 保持图片在原文中的相对位置
`
    : '';

  // Build content to process
  let contentToProcess = '';

  if (chunk.includesAbstract && chunk.abstractContent) {
    contentToProcess += `【摘要部分】\n${chunk.abstractContent}\n\n`;
  }

  for (const section of chunk.sections) {
    contentToProcess += `【${section.level === 1 ? '章节' : section.level === 2 ? '小节' : '子节'}：${section.title}】\n${section.content}\n\n`;
  }

  if (chunk.includesAcknowledgements && chunk.acknowledgementsContent) {
    contentToProcess += `【致谢部分】\n${chunk.acknowledgementsContent}\n\n`;
  }

  if (chunk.includesReferences && chunk.referencesContent) {
    contentToProcess += `【参考文献部分】\n${chunk.referencesContent}\n\n`;
  }

  // Determine which fields to request
  const metadataInstruction = isFirstChunk
    ? `"metadata": {
    "title": "论文标题",
    "title_en": "英文标题（如有）",
    "author_name": "作者姓名",
    "student_id": "学号（如有）",
    "school": "学院/院系",
    "major": "专业",
    "supervisor": "指导教师",
    "date": "日期"
  }`
    : `"metadata": {}`;

  const abstractInstruction = chunk.includesAbstract
    ? `"abstract": "中文摘要内容",
  "abstract_en": "英文摘要内容（如有）",
  "keywords": "关键词1、关键词2、关键词3",
  "keywords_en": "keyword1, keyword2, keyword3",`
    : '';

  const sectionsInstruction = hasOnlySections || chunk.sections.length > 0
    ? `"sections": [
    {"title": "章节标题", "content": "章节内容...", "level": 1},
    {"title": "子节标题", "content": "子节内容...", "level": 2}
  ],`
    : `"sections": [],`;

  const referencesInstruction = chunk.includesReferences ? `"references": "参考文献列表",` : '';
  const ackInstruction = chunk.includesAcknowledgements ? `"acknowledgements": "致谢内容",` : '';

  return `请从以下论文内容片段中提取结构化信息。**按原文实际结构提取，不要预设或强制套用固定的章节名称。**
${contextInfo}
输出 JSON 格式：

{
  ${metadataInstruction},
  ${abstractInstruction}
  ${sectionsInstruction}
  ${referencesInstruction}
  ${ackInstruction}
}

**重要说明：**
1. sections 数组包含论文的正文章节，按原文顺序排列
2. level: 1 表示一级标题（章），2 表示二级标题（节），3 表示三级标题
3. **章节标题只保留纯文字内容，去掉编号前缀**：
   - "第一章 绪论" → title: "绪论"
   - "1.1 研究背景" → title: "研究背景"
   - 编号会由 LaTeX 模板自动生成
4. 如果某个字段在内容中不存在，返回空字符串 "" 或空数组 []
5. 保持学术语言的严谨性
${figureInstructions}
内容片段：
${contentToProcess}`;
}

/**
 * Parse the LLM response for a chunk
 */
export function parseChunkResponse(responseText: string, chunkIndex: number): Partial<ThesisData> {
  const parsed = JSON.parse(responseText);

  const result: Partial<ThesisData> = {};

  // Parse metadata (only from first chunk typically)
  if (parsed.metadata && Object.keys(parsed.metadata).length > 0) {
    result.metadata = {
      title: parsed.metadata.title?.trim() || '',
      title_en: parsed.metadata.title_en?.trim() || undefined,
      author_name: parsed.metadata.author_name?.trim() || '',
      student_id: parsed.metadata.student_id?.trim() || undefined,
      school: parsed.metadata.school?.trim() || undefined,
      major: parsed.metadata.major?.trim() || undefined,
      supervisor: parsed.metadata.supervisor?.trim() || undefined,
      date: parsed.metadata.date?.trim() || undefined,
    };
  }

  // Parse sections
  if (Array.isArray(parsed.sections)) {
    result.sections = [];
    for (const sec of parsed.sections) {
      if (sec.title || sec.content) {
        result.sections.push({
          title: sec.title?.trim() || '',
          content: sec.content?.trim() || '',
          level: [1, 2, 3].includes(sec.level) ? sec.level : 1,
        });
      }
    }
  }

  // Parse special sections
  if (parsed.abstract?.trim()) {
    result.abstract = parsed.abstract.trim();
  }
  if (parsed.abstract_en?.trim()) {
    result.abstract_en = parsed.abstract_en.trim();
  }
  if (parsed.keywords?.trim()) {
    result.keywords = parsed.keywords.trim();
  }
  if (parsed.keywords_en?.trim()) {
    result.keywords_en = parsed.keywords_en.trim();
  }
  if (parsed.references?.trim()) {
    result.references = parsed.references.trim();
  }
  if (parsed.acknowledgements?.trim()) {
    result.acknowledgements = parsed.acknowledgements.trim();
  }

  return result;
}

/**
 * Delay helper for retry logic
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 2000,
  maxDelayMs: 10000,
};

/**
 * Calculate delay with exponential backoff
 */
export function calculateRetryDelay(retryCount: number): number {
  const delay = RETRY_CONFIG.baseDelayMs * Math.pow(2, retryCount);
  return Math.min(delay, RETRY_CONFIG.maxDelayMs);
}
