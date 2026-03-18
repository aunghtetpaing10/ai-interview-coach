import { describe, expect, it } from "vitest";
import {
  buildResumePreviewFromFile,
  buildResumePreviewFromText,
  formatFileSize,
  parseResumeFileName,
  summarizeResumeText,
} from "@/lib/resume/parser";

describe("resume helpers", () => {
  it("parses common resume filenames", () => {
    expect(parseResumeFileName("notes/jordan-resume.DOCX")).toEqual(
      expect.objectContaining({
        baseName: "jordan-resume",
        extension: "docx",
        kind: "docx",
        supported: true,
      }),
    );
  });

  it("formats file sizes for onboarding copy", () => {
    expect(formatFileSize(0)).toBe("0 bytes");
    expect(formatFileSize(512)).toBe("512 bytes");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5 MB");
  });

  it("builds a file-based resume preview", () => {
    expect(buildResumePreviewFromFile("resume.pdf", 2048)).toEqual(
      expect.objectContaining({
        source: "file",
        fileName: "resume",
        kind: "pdf",
        sizeLabel: "2 KB",
        supported: true,
      }),
    );
  });

  it("summarizes pasted resume text", () => {
    const text = "Senior engineer focused on scaling APIs and shipping product quality.";

    expect(summarizeResumeText(text)).toBe(text);
    expect(buildResumePreviewFromText(text)).toEqual(
      expect.objectContaining({
        source: "paste",
        kind: "txt",
        supported: true,
      }),
    );
  });
});
