import { createPageEntries, flattenToc, isInternalEpubLink } from "./reader-core.js";

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
      return;
    }

    coverImage.src = coverUrl;
    coverFallback.classList.add("hidden");
  } catch {
    coverImage.removeAttribute("src");
    coverFallback.classList.remove("hidden");
  }
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
      button.addEventListener("click", () => {
        showReader();
        state.rendition.display(chapter.href);
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
    button.addEventListener("click", () => {
      const cfi = book.locations.cfiFromLocation(page.index);
      if (!cfi) {
        return;
      }
      showReader();
      state.rendition.display(cfi);
    });

    item.appendChild(button);
    pageList.appendChild(item);
  }
}

function setupRenditionHandlers() {
  state.rendition.on("linkClicked", (href) => {
    if (isInternalEpubLink(href)) {
      showReader();
      state.rendition.display(href);
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

    const buffer = await file.arrayBuffer();
    state.book = ePub(buffer);
    state.rendition = state.book.renderTo("reader-frame", {
      width: "100%",
      height: "100%",
      spread: "none",
    });

    setupRenditionHandlers();

    await state.book.ready;

    const navigation = await state.book.loaded.navigation;
    renderToc(navigation?.toc ?? []);
    await renderPages(state.book);
    await renderCover(state.book);

    showCover();
    setStatus(`Loaded: ${state.book.packaging.metadata.title ?? file.name}`);
  } catch (error) {
    console.error(error);
    setStatus(`Unable to load EPUB: ${error?.message ?? "Unknown error"}`);
  }
}

previousButton.addEventListener("click", () => {
  if (!state.rendition || state.coverVisible) {
    return;
  }

  state.rendition.prev();
});

nextButton.addEventListener("click", async () => {
  if (!state.rendition) {
    return;
  }

  if (state.coverVisible) {
    showReader();
    await state.rendition.display();
    return;
  }

  state.rendition.next();
});

fileInput.addEventListener("change", async (event) => {
  const [selectedFile] = event.target.files;
  await loadBook(selectedFile);
});
