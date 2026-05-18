export function flattenToc(items, depth = 0, result = []) {
  for (const item of items ?? []) {
    result.push({
      label: item.label ?? "Unnamed section",
      href: item.href ?? null,
      depth,
    });

    if (item.subitems?.length) {
      flattenToc(item.subitems, depth + 1, result);
    }
  }

  return result;
}

export function createPageEntries(totalPages) {
  if (!Number.isFinite(totalPages) || totalPages <= 0) {
    return [];
  }

  return Array.from({ length: totalPages }, (_, index) => ({
    index,
    label: `Page ${index + 1}`,
  }));
}

export function isInternalEpubLink(href) {
  if (!href || typeof href !== "string") {
    return false;
  }

  const trimmed = href.trim();
  return !/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !trimmed.startsWith("//");
}

export function canNavigatePrevious(hasRendition, coverVisible) {
  return Boolean(hasRendition) && !coverVisible;
}

export function getNextNavigationAction(hasRendition, coverVisible) {
  if (!hasRendition) {
    return "none";
  }

  if (coverVisible) {
    return "open-first-page";
  }

  return "next-page";
}

export function getSelectedFile(fileList) {
  if (!fileList?.length) {
    return null;
  }

  return fileList[0] ?? null;
}
