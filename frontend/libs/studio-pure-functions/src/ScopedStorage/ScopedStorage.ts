type StorageKey = string;

export interface ScopedStorage extends Pick<Storage, 'setItem' | 'getItem' | 'removeItem'> {}

export interface ScopedStorageResult extends ScopedStorage {
  setItem: <T>(key: string, value: T) => void;
  getItem: <T>(key: string) => T;
  removeItem: (key: string) => void;
}

export class ScopedStorageImpl implements ScopedStorage {
  private readonly storageKey: StorageKey;
  private readonly scopedStorage: ScopedStorage;

  constructor(
    private storage: ScopedStorage,
    private key: StorageKey,
  ) {
    this.storageKey = this.key;
    this.scopedStorage = this.storage;
    this.setItem = this.setItem.bind(this);
    this.getItem = this.getItem.bind(this);
    this.removeItem = this.removeItem.bind(this);
  }

  public setItem<T>(key: string, value: T): void {
    const storageRecords: T | null = this.getAllRecordsInStorage();
    this.saveToStorage(
      JSON.stringify({
        ...storageRecords,
        [key]: value,
      }),
    );
  }

  public getItem<T>(key: string) {
    const records: T | null = this.getAllRecordsInStorage();

    if (!records) {
      return null;
    }

    return records[key] as T;
  }

  public removeItem<T>(key: string): void {
    const storageRecords: T | null = this.getAllRecordsInStorage<T>();

    if (!storageRecords) {
      return;
    }

    const storageCopy = { ...storageRecords };
    delete storageCopy[key];
    this.saveToStorage(JSON.stringify({ ...storageCopy }));
  }

  private getAllRecordsInStorage<T>(): T | null {
    return this.parseStorageData<T>(this.scopedStorage.getItem(this.storageKey));
  }

  private saveToStorage(value: string) {
    this.storage.setItem(this.storageKey, value);
  }

  private parseStorageData<T>(storage: string | null): T | null {
    if (!storage) {
      return null;
    }

    try {
      return JSON.parse(storage) satisfies T;
    } catch (error) {
      console.error(
        `Failed to parse storage with key ${this.storageKey}. Ensure that the storage is a valid JSON string. Error: ${error}`,
      );
      return null;
    }
  }
}
