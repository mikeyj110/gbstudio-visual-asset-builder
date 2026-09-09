# GB Asset Studio

A layer-based visual editor for creating GB Studio assets, including scene backgrounds, sprites, large backgrounds/stage maps, pixel-painted elements, text, images, and reusable selections from tilesets.

## Features

- Scene Background, Sprite, and Large Background / Stage Map asset modes
- Custom canvas width and height
- Layer visibility, ordering, duplication, and positioning
- Text, image, paint, and Sticker from Tileset layers
- Border and title layers for scene backgrounds
- Reusable 4-color palettes
- Pixel painting, shapes, alignment tools, and one-step undo/redo
- 1x, 2x, 5x, and 10x canvas zoom
- Optional single-pixel and 8x8 tile grids
- Tileset palette conversion and rectangular multi-tile selections
- JSON project save/load and PNG export
- Docker-hosted browser version
- Tauri desktop application for macOS and Windows

## Browser / Docker

```bash
docker compose up --build
```

Open <http://localhost:8080>.

## Desktop development

### Prerequisites

Tauri 2 requires Node.js, Rust, and platform build dependencies. On macOS, install Xcode Command Line Tools. On Windows, install Microsoft C++ Build Tools and WebView2.

Install JavaScript dependencies:

```bash
npm install
```

Run the desktop application in development mode:

```bash
npm run desktop:dev
```

Build a native desktop bundle:

```bash
npm run desktop:build
```

Build artifacts are written below `src-tauri/target/release/bundle/`.

## Project structure

```text
.
├── web/                 # Shared HTML/CSS/JavaScript editor
├── src-tauri/           # Native desktop wrapper
├── .github/workflows/   # macOS + Windows CI builds
├── Dockerfile
├── docker-compose.yml
└── package.json
```

The `web/` directory is the source of truth for the editor UI. Both the Docker/browser build and Tauri desktop application load the same frontend.

## Desktop distribution

Unsigned local builds are suitable for development. Public distribution should add Apple code signing/notarization for macOS and a Windows code-signing certificate before release.
