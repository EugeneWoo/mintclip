# YT Coach Chrome Extension

AI-powered YouTube video transcripts, summaries, and chat extension.

## Development

### Setup

```bash
npm install
```

### Build

```bash
# Development build with watch mode
npm run dev

# Production build
npm run build
```

### Load Extension in Chrome

1. Build the extension: `npm run build`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `extension/dist` folder

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
npm run format
```

## Project Structure

```
extension/
├── src/
│   ├── background/     # Service worker
│   ├── content/       # Content scripts
│   └── popup/         # Popup UI
├── assets/            # Icons and static assets
├── dist/              # Built extension (generated)
└── manifest.json      # Extension manifest
```

