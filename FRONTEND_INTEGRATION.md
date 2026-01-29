# 前端集成文档 - API接口说明

## 文档定位

本文档是**后端与前端的接口契约**，说明：
- 提供哪些API端点
- 请求/响应的数据格式
- 工作流程如何串联
- 关键业务概念

**不包含**：前端如何实现UI、状态管理、组件设计等（这些由前端团队自行决定）

---

## 工作流程概述

### 新3步流程（推荐）

```
1. POST /thesis/analyze
   ↓ 返回 analysisId + 分析结果

2. POST /thesis/generate （可选）
   ↓ 使用 analysisId，选择要生成的字段
   ↓ 返回生成的数据

3. POST /thesis/render
   ↓ 使用 analysisId，渲染PDF
   ↓ 返回 jobId

4. GET /thesis/jobs/:jobId （轮询）
   ↓ 获取PDF下载链接
```

**优势**：
- 用户可见文档缺失内容
- 用户控制AI生成范围
- 节省80%费用（按需生成）

### 旧2步流程（仍支持）

```
1. POST /thesis/extract 或 POST /thesis/upload
   ↓ AI自动提取所有内容

2. POST /thesis/render
   ↓ 渲染PDF
```

**说明**：所有旧端点继续工作，向后兼容。

---

## 认证

所有API请求需要JWT Token：

```http
Authorization: Bearer <your-jwt-token>
```

---

## API端点详细说明

### 1. 分析文档（第1步）

#### 基本信息

```
POST /thesis/analyze
Content-Type: multipart/form-data
```

**用途**：使用AI提取文档内容，分析完整性，返回分析结果和改进建议。

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | File | ✅ | 文档文件（.docx, .pdf, .txt, .md，最大50MB） |
| `templateId` | string | ✅ | 模板ID（见下方模板列表） |
| `model` | string | ❌ | LLM模型（默认：gpt-4o） |

**支持的模板ID**：
- `hunnu` - 湖南师范大学本科毕业论文
- `thu` - 清华大学学位论文
- `njulife` - 南京大学生命科学学院硕士论文 v1（8字段，含英文）
- `njulife-2` - 南京大学生命科学学院硕士论文 v2（5字段）
- `njuthesis` - 南京大学官方学位论文模板
- `scut` - 华南理工大学学位论文

#### 响应格式

```json
{
  "analysisId": "uuid",              // 分析ID，1小时有效期
  "extractedData": {
    "metadata": {
      "title": "论文标题",           // 提取的值或空字符串
      "title_en": "English Title",
      "author_name": "作者",
      "author_name_en": "Author Name",  // NJULife模板特有
      "student_id": "学号",
      "school": "学院",
      "major": "专业",
      "major_en": "Major Name",         // NJULife模板特有
      "supervisor": "导师",
      "supervisor_en": "Supervisor",    // NJULife模板特有
      "date": "日期"
    },
    "abstract": "中文摘要内容",
    "abstract_en": "English abstract",
    "keywords": "关键词1、关键词2",
    "keywords_en": "keyword1, keyword2",
    "sections": [
      {
        "title": "章节标题",
        "content": "章节内容...",
        "level": 1                      // 1=章, 2=节, 3=小节
      }
    ],
    "references": "参考文献内容",
    "acknowledgements": "致谢内容"
  },
  "templateRequirements": {
    "requiredFields": ["metadata.title", "metadata.author_name", ...],
    "requiredSections": ["sections"]
  },
  "analysis": {
    "completeness": {
      "metadata": {
        "title": "complete",           // complete | partial | missing
        "author_name": "complete",
        "supervisor": "missing",
        // ... 其他字段
      },
      "abstract": "partial",
      "abstract_en": "missing",
      "keywords": "complete",
      "keywords_en": "missing",
      "sections": {
        "hasContent": true,
        "count": 5,
        "qualityScore": "sparse"       // good | sparse | empty
      },
      "references": "missing",
      "acknowledgements": "missing"
    },
    "suggestions": [                   // 改进建议数组
      "缺少或不完整的元数据字段：supervisor, date",
      "摘要不完整。AI可以根据内容生成全面的摘要",
      "发现5个内容稀疏的章节",
      "参考文献部分缺失"
    ]
  },
  "model": "gpt-4o",
  "images": [
    {
      "id": "docximg1",
      "filename": "docximg1.png",
      "contentType": "image/png",
      "url": "/thesis/analyses/{analysisId}/images/docximg1"
    }
  ],
  "createdAt": "2024-01-29T12:00:00Z",
  "expiresAt": "2024-01-29T13:00:00Z"  // 1小时后过期
}
```

#### 特性说明

- **AI驱动**：使用LLM智能理解文档内容
- **模板感知**：不同模板返回不同的required fields
- **字段映射**：自动处理模板特有字段名（如advisor→supervisor）
- **长文档支持**：自动分块处理>45k字符的文档
- **处理时间**：短文档3-5秒，长文档更久

---

### 2. 生成字段（第2步，可选）

#### 基本信息

```
POST /thesis/generate
Content-Type: application/json
```

**用途**：选择性地使用AI生成缺失或不完整的字段。

#### 请求格式

```json
{
  "analysisId": "uuid",              // 从第1步获取
  "generateFields": {
    "metadata": ["supervisor", "date"],  // 要生成的元数据字段数组
    "abstract": true,                    // 生成/增强中文摘要
    "abstract_en": true,                 // 生成英文摘要
    "keywords": false,                   // 不生成
    "keywords_en": true,                 // 生成英文关键词
    "sections": {
      "enhance": true,                   // 增强现有章节
      "addMissing": ["结论", "展望"]     // 生成新章节（按标题）
    },
    "references": false,
    "acknowledgements": true
  },
  "model": "gpt-4o"  // 可选
}
```

**可生成的metadata字段**：
- `title`, `title_en`, `author_name`, `author_name_en`
- `student_id`, `school`, `major`, `major_en`
- `supervisor`, `supervisor_en`, `date`

**注意**：
- 所有字段都是可选的，只生成你指定的
- `metadata`数组中的字段名使用ThesisData标准名称（不是模板字段名）
- 可以多次调用，幂等操作

#### 响应格式

```json
{
  "enrichedData": {
    // 与extractedData格式相同
    // 包含原有数据 + AI生成的数据
    "metadata": {
      "title": "原有或生成的标题",
      "supervisor": "AI生成的导师",  // 新生成
      // ...
    },
    "abstract": "增强后的摘要",
    // ...
  },
  "generatedFields": [               // 实际生成了哪些字段
    "metadata",
    "abstract",
    "keywords_en",
    "acknowledgements"
  ],
  "model": "gpt-4o"
}
```

---

### 3. 渲染PDF（第3步）

#### 基本信息

```
POST /thesis/render
Content-Type: application/json
```

**用途**：使用分析/生成的数据渲染LaTeX并生成PDF。

#### 请求格式

```json
{
  "analysisId": "uuid",              // 新流程：使用analysisId
  // 或
  "extractionId": "uuid",            // 旧流程：使用extractionId

  "templateId": "njulife-2",         // 必填

  "document": {                      // 可选：手动覆盖的数据
    "metadata": {
      "title": "手动编辑的标题"
    },
    "sections": [
      // 手动编辑的章节
    ]
  }
}
```

**注意**：
- 必须提供`analysisId`或`extractionId`之一
- `document`参数可以覆盖分析/生成的数据

#### 响应格式

```json
{
  "jobId": "job-uuid",
  "status": "pending",               // pending | processing | completed | failed
  "pollUrl": "/thesis/jobs/job-uuid"
}
```

---

### 4. 查询任务状态（轮询）

#### 基本信息

```
GET /thesis/jobs/:jobId
```

**用途**：查询PDF渲染任务的进度和结果。

#### 响应格式

**进行中**：
```json
{
  "jobId": "job-uuid",
  "status": "processing",
  "progress": 75,
  "createdAt": "2024-01-29T12:00:00Z",
  "updatedAt": "2024-01-29T12:01:30Z"
}
```

**已完成**：
```json
{
  "jobId": "job-uuid",
  "status": "completed",
  "progress": 100,
  "downloadUrl": "/thesis/jobs/job-uuid/download",  // PDF下载链接
  "texUrl": "/thesis/jobs/job-uuid/tex",            // LaTeX源码下载
  "createdAt": "2024-01-29T12:00:00Z",
  "updatedAt": "2024-01-29T12:05:00Z"
}
```

**失败**：
```json
{
  "jobId": "job-uuid",
  "status": "failed",
  "error": "错误信息",
  "createdAt": "2024-01-29T12:00:00Z",
  "updatedAt": "2024-01-29T12:05:00Z"
}
```

**轮询建议**：每2秒查询一次，直到status为`completed`或`failed`。

---

### 5. 下载文件

#### PDF下载

```
GET /thesis/jobs/:jobId/download
```

返回：PDF文件（二进制）

#### LaTeX源码下载

```
GET /thesis/jobs/:jobId/tex
```

返回：.tex文件

---

## 辅助端点

### 获取可用模型列表

```
GET /thesis/models
```

响应：
```json
{
  "models": ["gpt-4o", "gpt-4-turbo", "DeepSeek-V3.2-Exp"],
  "defaultModel": "gpt-4o"
}
```

### 获取用户任务列表

```
GET /thesis/jobs?page=1&count=10
```

响应：
```json
{
  "jobs": [
    {
      "jobId": "job-uuid",
      "status": "completed",
      "templateId": "njulife-2",
      "createdAt": "2024-01-29T12:00:00Z",
      "downloadUrl": "/thesis/jobs/job-uuid/download"
    }
  ],
  "total": 42,
  "page": 1,
  "count": 10,
  "totalPages": 5
}
```

---

## 错误处理

### HTTP状态码

| 状态码 | 说明 | 处理建议 |
|--------|------|---------|
| `200` | 成功 | - |
| `400` | 请求参数错误 | 检查请求格式、文件类型 |
| `401` | 未授权 | Token无效或过期，重新登录 |
| `404` | 资源不存在 | analysisId过期（1小时）或jobId不存在 |
| `500` | 服务器错误 | 联系后端团队 |

### 错误响应格式

```json
{
  "statusCode": 400,
  "message": "错误描述",
  "error": "Bad Request"
}
```

### 常见错误

#### 1. 分析ID过期
```json
{
  "statusCode": 404,
  "message": "Analysis 'xxx' not found"
}
```
**解决**：重新调用`/thesis/analyze`

#### 2. 文件格式不支持
```json
{
  "statusCode": 400,
  "message": "Only .docx, .txt, .md, .pdf files are allowed"
}
```

#### 3. 模板ID无效
```json
{
  "statusCode": 404,
  "message": "Template 'xxx' not found"
}
```

---

## 关键概念说明

### analysisId
- 分析文档后返回的唯一ID
- **有效期1小时**
- 用于关联第2步（生成）和第3步（渲染）
- 过期后需重新分析

### templateId
- 指定使用哪个大学的论文模板
- 不同模板有不同的`requiredFields`
- 影响分析结果和PDF格式

### 字段映射
后端自动处理模板特有字段名：
- HUNNU: `advisor` → `supervisor`, `college` → `school`
- NJULife: `authorEn` → `author_name_en`, `majorEn` → `major_en`
- SCUT: `department` → `school`

前端始终使用标准ThesisData字段名（如`supervisor`），后端负责映射。

### completeness状态
- `complete`：字段有值且完整
- `partial`：字段有值但不完整（如摘要太短）
- `missing`：字段缺失或为空

---

## 简单调用示例

### JavaScript (纯Fetch API)

```javascript
const API_BASE = 'http://localhost:3000';
const token = 'your-jwt-token';

// 第1步：分析
async function step1_analyze(file, templateId) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('templateId', templateId);

  const response = await fetch(`${API_BASE}/thesis/analyze`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });

  return await response.json();
  // { analysisId, extractedData, analysis, ... }
}

// 第2步：生成（可选）
async function step2_generate(analysisId, fields) {
  const response = await fetch(`${API_BASE}/thesis/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      analysisId,
      generateFields: fields
    })
  });

  return await response.json();
  // { enrichedData, generatedFields, ... }
}

// 第3步：渲染
async function step3_render(analysisId, templateId) {
  const response = await fetch(`${API_BASE}/thesis/render`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ analysisId, templateId })
  });

  return await response.json();
  // { jobId, status, pollUrl }
}

// 第4步：轮询
async function step4_poll(jobId) {
  const response = await fetch(`${API_BASE}/thesis/jobs/${jobId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const job = await response.json();

  if (job.status === 'completed') {
    return job;  // { downloadUrl, texUrl, ... }
  } else if (job.status === 'failed') {
    throw new Error(job.error);
  } else {
    // 继续轮询
    await new Promise(resolve => setTimeout(resolve, 2000));
    return step4_poll(jobId);
  }
}

// 完整流程
async function completeWorkflow(file) {
  // 1. 分析
  const analysis = await step1_analyze(file, 'njulife-2');

  // 2. 根据分析结果，让用户选择要生成什么
  // （前端UI逻辑，此处省略）
  const selectedFields = {
    metadata: ['supervisor'],
    abstract: true
  };

  await step2_generate(analysis.analysisId, selectedFields);

  // 3. 渲染
  const renderJob = await step3_render(analysis.analysisId, 'njulife-2');

  // 4. 轮询直到完成
  const completedJob = await step4_poll(renderJob.jobId);

  // 5. 下载
  window.location.href = `${API_BASE}${completedJob.downloadUrl}`;
}
```

---

## 数据流图

```
┌─────────────┐
│  上传文件    │
└──────┬──────┘
       │
       ↓ POST /thesis/analyze
┌─────────────────────────┐
│  analysisId (1小时)      │
│  + extractedData         │
│  + analysis.suggestions  │
└──────┬──────────────────┘
       │
       ↓ 用户查看，选择要生成的字段
       │
       ↓ POST /thesis/generate (可选)
┌─────────────────────────┐
│  enrichedData            │
│  (包含生成的字段)        │
└──────┬──────────────────┘
       │
       ↓ POST /thesis/render
┌─────────────────────────┐
│  jobId                   │
└──────┬──────────────────┘
       │
       ↓ GET /thesis/jobs/:jobId (轮询)
       │
       ↓ status: completed
┌─────────────────────────┐
│  downloadUrl             │
│  (PDF文件)               │
└─────────────────────────┘
```

---

## 重要提醒

1. **analysisId有效期**：1小时，超时需重新分析
2. **文件大小限制**：最大50MB
3. **支持的文件格式**：.docx, .pdf, .txt, .md
4. **向后兼容**：旧的`/thesis/extract`和`/thesis/upload`端点仍然可用
5. **字段名规范**：前端使用ThesisData标准字段名，后端负责模板映射
6. **并发处理**：支持同时处理多个文档，通过不同的analysisId区分

---

## 技术支持

- **API详细文档**：`API_DOCUMENTATION.md`
- **字段映射说明**：`FIELD_MAPPING_IMPLEMENTATION.md`
- **Swagger UI**：http://localhost:3000/api （服务运行时可访问）
- **OpenAPI规范**：http://localhost:3000/api-json

---

## 更新日志

**v1.1.0 (2026-01-29)**
- 新增模板感知字段映射
- 支持NJULife英文字段（author_name_en, major_en, supervisor_en）
- 新增6个模板支持
- `/thesis/analyze`端点使用AI驱动

**v1.0.0**
- 初始3步工作流
- AI生成功能
- 向后兼容旧API

---

**准备好开始了吗？** 从`POST /thesis/analyze`开始对接！
