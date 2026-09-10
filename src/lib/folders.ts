import { Folder } from '@/types/folder';
import { localStorage } from './storage';

export const saveFolders = (folders: Folder[]) => {
  localStorage.setItem('folders', JSON.stringify(folders));
};