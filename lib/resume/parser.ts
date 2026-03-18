import type { ResumeFileKind, ResumeUploadPreview } from "@/lib/resume/types";

const EXTENSION_KIND_MAP: Record<string, ResumeFileKind> = {
  pdf: "pdf",
  doc: "docx",
  docx: "docx",
  txt: "txt",
  md: "md",
  markdown: "md",
};

export function formatFileSize(bytes: number) {
  const formatNumber = (value: number) =>
    Number.isInteger(value)
      ? `${value}`
      : value.toFixed(value >= 10 ? 0 : 1);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 bytes";
  }

  if (bytes < 1024) {
    return `${bytes} bytes`;
  }

  const kilobytes = bytes / 1024;

  if (kilobytes < 1024) {
    return `${formatNumber(kilobytes)} KB`;
  }

  const megabytes = kilobytes / 1024;

  return `${formatNumber(megabytes)} MB`;
}

export function parseResumeFileName(fileName: string) {
  const trimmed = fileName.trim().replaceAll("\\", "/");
  const baseName = trimmed.split("/").pop() ?? trimmed;
  const dotIndex = baseName.lastIndexOf(".");
  const extension = dotIndex > 0 ? baseName.slice(dotIndex + 1).toLowerCase() : "";
  const sanitizedBaseName = dotIndex > 0 ? baseName.slice(0, dotIndex) : baseName;
  const kind = EXTENSION_KIND_MAP[extension] ?? "unknown";

  return {
    baseName: sanitizedBaseName.replace(/\s+/g, " ").trim(),
    extension,
    kind,
    supported: kind !== "unknown",
  };
}

export function summarizeResumeText(text: string) {
  const collapsed = text.replace(/\s+/g, " ").trim();

  if (!collapsed) {
    return "Paste a resume summary to ground the interview.";
  }

  if (collapsed.length <= 120) {
    return collapsed;
  }

  return `${collapsed.slice(0, 117).trimEnd()}...`;
}

export function buildResumePreviewFromFile(
  fileName: string,
  bytes: number,
): ResumeUploadPreview {
  const parsed = parseResumeFileName(fileName);

  return {
    source: "file",
    fileName: parsed.baseName || fileName,
    kind: parsed.kind,
    sizeLabel: formatFileSize(bytes),
    supported: parsed.supported,
    summary: parsed.supported
      ? `Uploaded ${parsed.kind.toUpperCase()} resume shell`
      : "Upload a PDF, DOCX, Markdown, or text export to enable parsing.",
  };
}

export function buildResumePreviewFromText(text: string): ResumeUploadPreview {
  const collapsed = text.replace(/\s+/g, " ").trim();

  if (!collapsed) {
    return {
      source: "none",
      fileName: "No resume yet",
      kind: "unknown",
      sizeLabel: "0 chars",
      supported: false,
      summary: "Paste a resume summary to ground the interview.",
    };
  }

  return {
    source: "paste",
    fileName: "Pasted resume notes",
    kind: "txt",
    sizeLabel: `${collapsed.length} chars`,
    supported: true,
    summary: summarizeResumeText(collapsed),
  };
}
