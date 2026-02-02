# ImagePump

A powerful Next.js web application for batch AI image editing. Upload multiple images, apply prompts, and download all processed results as a ZIP file.

## Features

- **Batch Processing** - Upload and process multiple images at once
- **Multiple AI Providers** - Choose from 9 different AI image generation services
- **Prompt Groups** - Apply different prompts to different image sets
- **Image Compression** - Compress results with quality presets (Low/Medium/High)
- **ZIP Download** - Download all processed images in a single ZIP file
- **Before/After Comparison** - Compare original and edited images side-by-side
- **Rate Limit Handling** - Automatic retry with exponential backoff
- **User-Friendly Errors** - Clear, actionable error messages

## Supported AI Providers

| Provider | Type | API Key Required |
|----------|------|------------------|
| OpenAI (DALL-E) | Paid | Yes |
| Google (Gemini 2.0 Flash) | Paid | Yes |
| Stability AI (SD3) | Paid | Yes |
| Together AI (FLUX) | Free 3 months | Yes |
| Leonardo.AI | Paid | Yes |
| ClipDrop | Paid | Yes |
| Local SD (Forge/A1111) | Free | No (local) |
| Puter | Free | No |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/imagepump.git
cd imagepump

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm run start
```

## Usage

1. **Select AI Provider** - Choose your preferred AI service and enter your API key
2. **Upload Images** - Drag and drop or click to upload images (JPEG, PNG, WebP, max 10MB)
3. **Set Prompts** - Enter a default prompt or create prompt groups for different images
4. **Process** - Click "Process" to start AI image generation
5. **Download** - Download individual images or all as a ZIP file

## Local Stable Diffusion Setup

To use free local image generation with Stable Diffusion WebUI Forge:

1. Install [SD WebUI Forge](https://github.com/lllyasviel/stable-diffusion-webui-forge)
2. Download a model (e.g., SDXL Base) to `models/Stable-diffusion/`
3. Start Forge with API enabled:
   ```bash
   ./webui.sh --api
   ```
4. Select "Local SD (Free)" in ImagePump
5. Enter URL: `http://127.0.0.1:7860`

## Tech Stack

- **Framework**: Next.js 16
- **UI**: React 19, Tailwind CSS 4
- **State**: Zustand
- **Image Processing**: Sharp
- **ZIP Generation**: JSZip

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── generate/    # AI image generation endpoint
│   │   ├── compress/    # Image compression endpoint
│   │   └── download/    # ZIP download endpoint
│   ├── page.tsx         # Main application page
│   └── layout.tsx       # Root layout
├── components/
│   ├── ImageUploader/   # Upload and preview
│   ├── PromptEditor/    # Prompt management
│   ├── ProcessingQueue/ # Queue status
│   ├── ResultsGallery/  # Results display
│   └── ui/              # Reusable components
├── hooks/               # Custom React hooks
├── lib/                 # Utilities and API clients
├── store/               # Zustand state management
└── types/               # TypeScript definitions
```

## API Key Security

- API keys are stored in memory only (not persisted)
- All API calls are proxied through Next.js API routes
- Keys are never exposed to the client

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
