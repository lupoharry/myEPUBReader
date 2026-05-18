# myEPUBReader

A standalone browser-based EPUB reader that loads local EPUB files, displays chapter/page navigation, and renders book content with previous/next controls.

## EPUB 3 specifications used

This project aligns with the EPUB specification set maintained in [`w3c/epub-specs`](https://github.com/w3c/epub-specs):

- EPUB 3.3 Recommendation: https://www.w3.org/TR/epub-33/
- EPUB Reading Systems 3.3: https://www.w3.org/TR/epub-rs-33/
- Ongoing drafts in the EPUB specs repo: https://w3c.github.io/epub-specs/

The reader behavior in this repo focuses on these EPUB 3 concepts:

- Package metadata and cover discovery
- Navigation document parsing for chapter outline
- Spine/resource navigation and in-publication internal linking

## Features

- Load an `.epub` file from a file dialog (`Open EPUB`)
- Two-pane layout:
  - **Left:** chapter outline and generated page list
  - **Right:** cover display and reading viewport
- Navigation buttons below the page:
  - `← Previous`
  - `Next →`
- Internal EPUB links are resolved and opened in the same reading viewport
- External links open in a new browser tab

## Project structure

- `/index.html`
  - Main standalone page shell and UI containers
  - Loads EPUB.js from CDN and boots the app module
- `/assets/styles.css`
  - Layout and styling for toolbar, sidebar, viewer, and controls
- `/src/app.js`
  - Runtime EPUB reader logic:
    - file loading
    - EPUB.js book/rendition setup
    - TOC rendering
    - page list generation
    - cover handling
    - previous/next and link navigation behavior
- `/src/reader-core.js`
  - Pure helper utilities for TOC flattening, page entry generation, and link type checks
- `/tests/reader-core.test.js`
  - Node test cases for helper logic
- `/package.json`
  - Project metadata and test script

## How to run

Because this is a browser app with ES modules, serve the folder with any static server and open `index.html`.

Example using Python:

```bash
cd myEPUBReader
python -m http.server 8080
```

Then open:

- http://localhost:8080/index.html

## Development

### Install dependencies

No local npm dependencies are required for runtime. The project includes a minimal `package.json` for tests.

### Run tests

```bash
cd myEPUBReader
npm test
```

## Test coverage included

Current automated tests validate:

- nested TOC flattening and depth tracking
- generated page list entries from location counts
- safeguards for invalid page totals
- internal-vs-external link detection

## Notes and limitations

- Page entries are generated from EPUB.js location mapping and represent generated reading locations, not print pagination.
- Internal link handling depends on EPUB content validity and manifest/navigation correctness.
- If an EPUB does not provide a cover image, a fallback message is shown.
