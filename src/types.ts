export interface EditorFile {
  path: string;
  content: string;
  language?: string;
  description?: string;
}

export interface EditorConfig {
  files: EditorFile[];
}