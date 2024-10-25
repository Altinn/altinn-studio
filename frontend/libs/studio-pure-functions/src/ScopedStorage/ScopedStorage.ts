type StorageKey = string;

export interface ScopedStorage extends Pick<Storage, 'setItem' | 'getItem' | 'removeItem'> {}

export class ScopedStorageImpl implements ScopedStorage {
  private readonly storageKey: StorageKey;
  private readonly scopedStorage: ScopedStorage;

  constructor(
    private storage: ScopedStorage,
    private key: StorageKey,
  ) {
    this.storageKey = this.key;
    this.scopedStorage = this.storage;
  }

  public setItem<T>(key: string, value: T): void {
    const storageRecords: T = this.getAllRecordsInStorage();
    this.saveToStorage(
      JSON.stringify({
        ...storageRecords,
        [key]: value,
      }),
    );
  }

  public getItem<T>(key: string) {
    const records: T = this.getAllRecordsInStorage();

    if (!records) {
      return null;
    }

    return records[key] as unknown as T;
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
