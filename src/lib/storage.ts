import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV();

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

class LocalStorageAdapter implements StorageLike {
  getItem(key: string): string | null {
    return storage.getString(key) ?? null;
  }

  setItem(key: string, value: string): void {
    storage.set(key, value);
  }

  removeItem(key: string): void {
    storage.remove(key);
  }
}

export const localStorage: StorageLike = new LocalStorageAdapter();