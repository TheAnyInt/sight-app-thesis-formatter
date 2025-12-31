# Thesis Formatter

NestJS microservice for formatting thesis documents according to Tsinghua University template.

## Features

- Upload `.docx` thesis drafts via REST API
- Extract text and images using `mammoth`
- Parse content with OpenAI LLM to extract structured data
- Dynamic chapter extraction (adapts to any thesis structure)
- Format references according to **GB/T 7714-2015** Chinese standard
- Fill Tsinghua thesis template using `docxtemplater`
- Return formatted document as download

## Tech Stack

- **Framework**: NestJS (TypeScript)
- **Document Extraction**: mammoth
- **Template Engine**: docxtemplater + pizzip
- **LLM**: OpenAI SDK (configurable model)
- **File Upload**: Multer

## Installation

```bash
npm install
cp .env.example .env
# Edit .env with your OpenAI API key
```

## Configuration

```env
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://api.openai.com/v1  # Optional, for custom endpoints
OPENAI_MODEL=gpt-4o                         # Configurable model
PORT=3000
```

## Usage

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API

### POST /thesis/upload

Upload a `.docx` thesis draft and receive a formatted document.

```bash
curl -X POST http://localhost:3000/thesis/upload \
  -F "file=@your-thesis.docx" \
  --output formatted_thesis.docx
```

## Template Placeholders

The template supports 17 placeholders:

| Category | Fields |
|----------|--------|
| Metadata | `title`, `school`, `major`, `author_name`, `student_id`, `supervisor`, `date` |
| Signature | `author_signature`, `signature_date` |
| Content | `introduction`, `technical_comparison`, `industry_comparison`, `key_variables`, `development_trends`, `conclusion` |
| Other | `references`, `acknowledgements` |

## Project Structure

```
src/
├── main.ts                    # Bootstrap
├── app.module.ts              # Root module
├── thesis/                    # Thesis module
│   ├── thesis.controller.ts   # POST /thesis/upload
│   ├── thesis.service.ts      # Orchestration
│   └── dto/thesis-data.dto.ts # Data interfaces
├── document/                  # Document processing
│   ├── extraction.service.ts  # Text & image extraction
│   └── template.service.ts    # Template filling
├── reference/                 # Reference formatting
│   └── reference-formatter.service.ts  # GB/T 7714-2015
└── llm/                       # LLM integration
    └── llm.service.ts         # OpenAI parsing
```

## License

MIT
