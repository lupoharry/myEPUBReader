import {
  canNavigatePrevious,
  createPageEntries,
  flattenToc,
  getNextNavigationAction,
  getSelectedFile,
  isInternalEpubLink,
} from "./reader-core.js";

const fileInput = document.getElementById("epub-file");
const statusNode = document.getElementById("status");
const tocList = document.getElementById("toc-list");
const pageList = document.getElementById("page-list");
const coverPanel = document.getElementById("cover-panel");
const coverImage = document.getElementById("cover-image");
const coverFallback = document.getElementById("cover-fallback");
const readerFrame = document.getElementById("reader-frame");
const previousButton = document.getElementById("prev-page");
const nextButton = document.getElementById("next-page");

const state = {
  book: null,
  rendition: null,
  coverVisible: true,
};

async function tryLoadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => reject(new Error("Cover image failed to load."));
    image.src = url;
  });
}

function setStatus(message) {
  statusNode.textContent = message;
}

function clearList(element) {
  element.replaceChildren();
}

function showCover() {
  state.coverVisible = true;
  coverPanel.classList.remove("hidden");
  readerFrame.classList.add("hidden");
}

function showReader() {
  state.coverVisible = false;
  coverPanel.classList.add("hidden");
  readerFrame.classList.remove("hidden");
}

async function renderCover(book) {
  try {
    const coverUrl = await book.coverUrl();
    if (!coverUrl) {
      coverImage.removeAttribute("src");
      coverFallback.classList.remove("hidden");
      return false;
    }

    await tryLoadImage(coverUrl);
    coverImage.src = coverUrl;
    coverFallback.classList.add("hidden");
    return true;
  } catch {
    coverImage.removeAttribute("src");
    coverFallback.classList.remove("hidden");
    return false;
  }
}

function getDisplayTargets(target) {
  if (!target || typeof target !== "string") {
    return [target];
  }

  const targets = [target];

  try {
    const decoded = decodeURI(target);
    if (!targets.includes(decoded)) {
      targets.push(decoded);
    }
  } catch {
    // Keep the original href when URI decoding fails.
  }

  if (target.includes("#")) {
    const [withoutFragment] = target.split("#");
    if (withoutFragment && !targets.includes(withoutFragment)) {
      targets.push(withoutFragment);
    }

    try {
      const decodedWithoutFragment = decodeURI(withoutFragment);
      if (decodedWithoutFragment && !targets.includes(decodedWithoutFragment)) {
        targets.push(decodedWithoutFragment);
      }
    } catch {
      // Keep existing targets when URI decoding fails.
    }
  }

  return targets;
}

async function displayTarget(target, errorContext) {
  if (!state.rendition) {
    return false;
  }

  const targets = getDisplayTargets(target);
  for (const candidate of targets) {
    try {
      await state.rendition.display(candidate);
      return true;
    } catch {
      // Continue with the next candidate target.
    }
  }

  setStatus(`Unable to open ${errorContext}.`);
  return false;
}

function renderToc(tocItems) {
  clearList(tocList);

  const flattened = flattenToc(tocItems);
  if (!flattened.length) {
    const empty = document.createElement("li");
    empty.textContent = "No chapter outline found.";
    tocList.appendChild(empty);
    return;
  }

  for (const chapter of flattened) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = chapter.label;
    button.style.paddingLeft = `${chapter.depth * 0.85 + 0.5}rem`;

    if (chapter.href) {
      button.addEventListener("click", async () => {
        showReader();
        await displayTarget(chapter.href, `chapter "${chapter.label}"`);
      });
    } else {
      button.disabled = true;
    }

    item.appendChild(button);
    tocList.appendChild(item);
  }
}

async function renderPages(book) {
  clearList(pageList);

  await book.locations.generate(1600);
  const pageCount = typeof book.locations.length === "function" ? book.locations.length() : 0;
  const pages = createPageEntries(pageCount);

  if (!pages.length) {
    const empty = document.createElement("li");
    empty.textContent = "No generated page map available.";
    pageList.appendChild(empty);
    return;
  }

  for (const page of pages) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = page.label;
    button.addEventListener("click", async () => {
      const cfi = book.locations.cfiFromLocation(page.index);
      if (!cfi) {
        setStatus(`Unable to open ${page.label}.`);
        return;
      }
      showReader();
      await displayTarget(cfi, page.label);
    });

    item.appendChild(button);
    pageList.appendChild(item);
  }
}

function setupRenditionHandlers() {
  state.rendition.on("linkClicked", async (href) => {
    if (isInternalEpubLink(href)) {
      showReader();
      await displayTarget(href, "internal link target");
      return;
    }

    window.open(href, "_blank", "noopener,noreferrer");
  });
}

async function loadBook(file) {
  if (!file) {
    return;
  }

  try {
    setStatus("Loading EPUB…");

    if (state.book) {
      state.book.destroy();
    }

    if (state.rendition) {
      state.rendition.destroy();
      state.rendition = null;
    }

    const buffer = await file.arrayBuffer();
    if (typeof JSZip === "undefined") {
      throw new Error("JSZip did not load. Refresh the page and try again.");
    }
    if (typeof ePub !== "function") {
      throw new Error("EPUB.js did not load. Refresh the page and try again.");
    }
    // EPUB.js is loaded from CDN in index.html and exposes the global `ePub` factory.
    state.book = ePub(buffer);
    state.rendition = state.book.renderTo("reader-frame", {
      width: "100%",
      height: "100%",
      spread: "none",
    });

    setupRenditionHandlers();

    await state.book.ready;
    await displayTarget(undefined, "the first page");

    const navigation = await state.book.loaded.navigation;
    renderToc(navigation?.toc ?? []);
    await renderPages(state.book);
    const hasCoverImage = await renderCover(state.book);

    if (hasCoverImage) {
      showCover();
    } else {
      // Many EPUB publications use the first spine item as a cover page.
      showReader();
    }

    setStatus(`Loaded: ${state.book.packaging.metadata.title ?? file.name}`);
  } catch (error) {
    console.error(`Failed to load EPUB file "${file.name}"`, error);
    const errorName = error?.name && error.name !== "Error" ? `${error.name} ` : "";
    setStatus(`Unable to load EPUB "${file.name}": ${errorName}${error?.message ?? "Unknown error"}`);
  }
}

previousButton.addEventListener("click", () => {
  if (!canNavigatePrevious(state.rendition, state.coverVisible)) {
    return;
  }

  state.rendition.prev();
});

nextButton.addEventListener("click", async () => {
  const action = getNextNavigationAction(state.rendition, state.coverVisible);
  if (action === "open-first-page") {
    showReader();
    await displayTarget(undefined, "the first page");
    return;
  }

  if (action === "next-page") {
    state.rendition.next();
  }
});

fileInput.addEventListener("change", async (event) => {
  const selectedFile = getSelectedFile(event.target.files);
  await loadBook(selectedFile);
});
