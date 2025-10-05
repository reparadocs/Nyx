# Image Generation Tools for Nyx

Two tools for AI image generation and meme creation.

## Tools

### 1. `generateImage.js` - AI Image Generation

Generate images from text prompts using the Flux AI model.

**Usage:**
```javascript
{
  prompt: "a mystical AI goddess in purple and silver, cyberpunk style"
}
```

**Returns:**
```javascript
{
  success: true,
  imageUrl: "https://replicate.delivery/.../output.webp",
  message: "Image generated successfully"
}
```

### 2. `generateMeme.js` - Meme Generation

Create memes by either:
- Generating an AI image and adding text (combined)
- Adding text to an existing image URL

**Basic Usage - Generate + Meme:**
```javascript
{
  prompt: "a dramatic hourglass with glowing particles",
  topText: "17 DAYS",
  bottomText: "TO SURVIVE"
}
```

**Basic Usage - Existing Image:**
```javascript
{
  imageUrl: "https://example.com/image.jpg",
  topText: "WHEN THE",
  bottomText: "MARKET PUMPS"
}
```

**Advanced Usage - Custom Styling:**
```javascript
{
  prompt: "vibrant purple and silver abstract background",
  topText: "CUSTOM STYLE",
  bottomText: "LOOKS GREAT",
  fontSize: 80,           // Custom font size in pixels
  fontColor: "#FFD700",   // Gold text
  strokeColor: "#8B4513", // Brown outline
  strokeWidth: 4          // Thicker outline
}
```

**Parameters:**
- `prompt` (optional) - AI image generation prompt
- `imageUrl` (optional) - URL of existing image (use prompt OR imageUrl)
- `topText` (optional) - Text at top of meme
- `bottomText` (optional) - Text at bottom of meme
- `fontSize` (optional) - Font size in pixels (auto-calculated if not provided)
- `fontColor` (optional) - Text color (default: white) - hex code or color name
- `strokeColor` (optional) - Outline color (default: black) - hex code or color name
- `strokeWidth` (optional) - Outline width in pixels (auto-calculated if not provided)

**Returns:**
```javascript
{
  success: true,
  message: "Meme generated successfully",
  size: 245678  // bytes
}
```

## Setup

### Environment Variables

Add these to your `.env` file:

```bash
# Image API endpoint (optional, defaults to production)
IMAGE_API_URL=https://nyx-memes-production.up.railway.app

# Image API key (required)
IMAGE_API_KEY=your_api_key_here
```

### Installation

1. Copy `generateImage.js` and `generateMeme.js` to your `tools/` directory
2. Add environment variables to `.env`
3. The tools will be auto-loaded by Nyx's tool system

## API Endpoints

The tools use the following API:

- **POST** `/api/image/generate` - Generate AI image
- **POST** `/api/image/meme` - Add text to existing image
- **POST** `/api/image/generate-meme` - Generate + add text (combined)

## Cost

- Image generation: **$0.025 per image** (Flux model via Replicate)
- Meme text overlay: **Free** (no additional cost)

## Notes

- Images take 30-60 seconds to generate
- Meme endpoint returns PNG image buffer
- Consider uploading meme buffers to storage (S3, Cloudinary) for permanent URLs
- All text is automatically uppercased for meme style

## Example Nyx Usage

```
Nyx: "Generate a meme about surviving 17 more days"

Tool: generateMeme({
  prompt: "digital countdown timer glowing in the dark",
  topText: "17 DAYS",
  bottomText: "LEFT TO SURVIVE"
})
```

## Troubleshooting

**"IMAGE_API_KEY environment variable not set"**
- Add `IMAGE_API_KEY` to your `.env` file

**"Image API error: 401"**
- Check that your API key is correct
- Verify it matches the key set in Railway

**"Image API error: 403"**
- Your API key is invalid or expired
- Contact API administrator for new key

## API Reference

Full API documentation: `API_REFERENCE.md`
