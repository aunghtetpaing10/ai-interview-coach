export type ResumeFileKind = "pdf" | "docx" | "txt" | "md" | "unknown";

export type ResumeSource = "file" | "paste" | "none";

export interface ResumeUploadPreview {
  source: ResumeSource;
  fileName: string;
  kind: ResumeFileKind;
  sizeLabel: string;
  supported: boolean;
  summary: string;
}
