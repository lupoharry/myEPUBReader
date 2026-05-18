import test from "node:test";
import assert from "node:assert/strict";

import {
  canNavigatePrevious,
  createPageEntries,
  flattenToc,
  getNextNavigationAction,
  getSelectedFile,
  isInternalEpubLink,
} from "../src/reader-core.js";

test("flattenToc flattens nested items while preserving depth", () => {
  const result = flattenToc([
    {
      label: "Chapter 1",
      href: "chapter-1.xhtml",
      subitems: [
        { label: "Section 1.1", href: "chapter-1.xhtml#s1" },
        { label: "Section 1.2", href: "chapter-1.xhtml#s2" },
      ],
    },
    {
      label: "Chapter 2",
      href: "chapter-2.xhtml",
    },
  ]);

  assert.deepEqual(result, [
    { label: "Chapter 1", href: "chapter-1.xhtml", depth: 0 },
    { label: "Section 1.1", href: "chapter-1.xhtml#s1", depth: 1 },
    { label: "Section 1.2", href: "chapter-1.xhtml#s2", depth: 1 },
    { label: "Chapter 2", href: "chapter-2.xhtml", depth: 0 },
  ]);
});

test("createPageEntries creates one page entry per location", () => {
  const result = createPageEntries(3);

  assert.deepEqual(result, [
    { index: 0, label: "Page 1" },
    { index: 1, label: "Page 2" },
    { index: 2, label: "Page 3" },
  ]);
});

test("createPageEntries guards against invalid totals", () => {
  assert.deepEqual(createPageEntries(0), []);
  assert.deepEqual(createPageEntries(-3), []);
  assert.deepEqual(createPageEntries(Number.NaN), []);
});

test("isInternalEpubLink detects internal vs external links", () => {
  assert.equal(isInternalEpubLink("chapter-3.xhtml#frag"), true);
  assert.equal(isInternalEpubLink("#frag"), true);
  assert.equal(isInternalEpubLink("https://example.com"), false);
  assert.equal(isInternalEpubLink("mailto:test@example.com"), false);
  assert.equal(isInternalEpubLink("//cdn.example.com/resource"), false);
});

test("canNavigatePrevious requires rendition and hidden cover", () => {
  assert.equal(canNavigatePrevious({}, false), true);
  assert.equal(canNavigatePrevious(null, false), false);
  assert.equal(canNavigatePrevious({}, true), false);
});

test("getNextNavigationAction reflects cover and rendition state", () => {
  assert.equal(getNextNavigationAction(null, true), "none");
  assert.equal(getNextNavigationAction({}, true), "open-first-page");
  assert.equal(getNextNavigationAction({}, false), "next-page");
});

test("getSelectedFile returns first file or null", () => {
  assert.equal(getSelectedFile(undefined), null);
  assert.equal(getSelectedFile([]), null);
  assert.equal(getSelectedFile(["book.epub", "other.epub"]), "book.epub");
});
