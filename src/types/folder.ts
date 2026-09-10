export interface Folder {
  id: string;
  name: string;
  type: 'chat' | 'prompt';
}

export type FolderType = 'chat' | 'prompt';