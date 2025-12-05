import dot from 'dot-object';

import type { IDataModelReference } from 'src/layout/common.generated';

type ReaderMap = { [name: string]: DataModelReader };

interface Context {
  readers: DataModelReaders;
  updateModel: (newModel: DataModelReader) => void;
  availableModels: string[];
  reset: () => void;
}

type Status = 'loading' | 'loaded' | 'error';

export class DataModelReader {
  constructor(
    protected name: string,
    protected model: object | undefined = undefined,
    protected status: Status = 'loading',
  ) {}

  getAsString(reference: IDataModelReference): string | undefined {
    if (!this.model || this.name !== reference.dataType) {
      return undefined;
    }
    const realValue = dot.pick(reference.field, this.model);
    if (typeof realValue === 'string' || typeof realValue === 'number' || typeof realValue === 'boolean') {
      return realValue.toString();
    }
    return undefined;
  }

  getName(): string {
    return this.name;
  }

  isLoading(): boolean {
    return this.status === 'loading';
  }

  hasError(): boolean {
    return this.status === 'error';
  }

  equals(other: DataModelReader): boolean {
    return this.name === other.name && this.model === other.model && this.status === other.status;
  }
}

type AccessingCallback = (dataModel: DataModelReader) => void;

export class DataModelReaders {
  protected onAccessingNewDataModel?: AccessingCallback;
  protected locallyAddedReaders: ReaderMap = {};

  constructor(protected readonly readers: ReaderMap) {}

  getReader(name: string): DataModelReader {
    if (this.locallyAddedReaders[name]) {
      return this.locallyAddedReaders[name];
    }

    if (!this.readers[name]) {
      const reader = new DataModelReader(name);
      if (this.onAccessingNewDataModel) {
        this.onAccessingNewDataModel(reader);
      }
      this.locallyAddedReaders[name] = reader;
      return reader;
    }
    return this.readers[name];
  }

  setOnAccessingNewDataModel(callback: AccessingCallback) {
    this.onAccessingNewDataModel = callback;
  }

  getAll(): DataModelReader[] {
    return Object.values(this.readers);
  }
}
