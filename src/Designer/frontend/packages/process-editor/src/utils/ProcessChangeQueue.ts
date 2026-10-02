import { isAxiosError } from 'axios';
import type {
  ProcessChange,
  ProcessChangeContent,
  ProcessState,
} from 'app-shared/types/api/ProcessState';

export type ProcessSaveFailure =
  | { kind: 'conflict' }
  /** The server may have applied the request despite the error. */
  | { kind: 'lost' }
  | { kind: 'rejected' }
  | { kind: 'loadFailed' };

export type ProcessSaveStatus = {
  pending: boolean;
  editingBlocked: boolean;
  failure?: ProcessSaveFailure;
};

export type QueuedProcessChange = {
  content: Omit<ProcessChangeContent, 'bpmnXml'>;
  /** Serialization started when the edit was made. */
  xml?: Promise<string>;
  /** Task removal can make the server clean references from the saved XML. */
  addsOrRemovesTasks?: boolean;
  onSuccess?: (imported: boolean) => void;
};

export type ProcessChangeQueueDependencies = {
  save: (change: ProcessChange) => Promise<ProcessState>;
  load: () => Promise<ProcessState>;
  /** change is absent when reloading after discard. */
  importState: (state: ProcessState, change?: QueuedProcessChange['content']) => Promise<void>;
  onStatusChange: (status: ProcessSaveStatus) => void;
};

type PendingChange = QueuedProcessChange & { request?: ProcessChange };

const processStateConflictCode = 'process_state_conflict';

export class ProcessChangeQueue {
  private readonly changes: PendingChange[] = [];
  private version: string;
  private savedXml: string;
  private running = false;
  private retrying = false;
  private replacingDiagram = false;
  private failure?: ProcessSaveFailure;
  private publishedStatus?: ProcessSaveStatus;

  constructor(
    initialState: ProcessState,
    private readonly dependencies: ProcessChangeQueueDependencies,
  ) {
    this.version = initialState.version;
    this.savedXml = initialState.bpmnXml;
  }

  public get status(): ProcessSaveStatus {
    return {
      pending: !this.failure && (this.changes.length > 0 || this.replacingDiagram),
      editingBlocked: this.editingBlocked,
      failure: this.failure,
    };
  }

  /** Returns false when editing is blocked. */
  public enqueue(change: QueuedProcessChange): boolean {
    // Serialization can fail before an earlier request finishes, or for a change that is never sent.
    void change.xml?.catch(() => {});
    if (this.editingBlocked) return false;
    this.changes.push({ ...change });
    this.publishStatus();
    void this.run();
    return true;
  }

  public retry(): void {
    if (this.running || this.failure?.kind !== 'lost') return;
    this.failure = undefined;
    this.retrying = true;
    this.publishStatus();
    void this.run();
  }

  public async discard(): Promise<void> {
    if (this.running || !this.failure) return;
    this.running = true;
    try {
      await this.loadSavedState();
    } finally {
      this.running = false;
      this.publishStatus();
    }
  }

  private get editingBlocked(): boolean {
    return (
      this.retrying ||
      this.replacingDiagram ||
      Boolean(this.failure) ||
      this.changes.some(canChangeProcessOnServer)
    );
  }

  private async run(): Promise<void> {
    if (this.running || this.failure) return;
    this.running = true;
    try {
      while (this.changes.length > 0 && !this.failure) {
        await this.saveFirstChange();
      }
    } finally {
      this.running = false;
      this.retrying = false;
      this.publishStatus();
    }
  }

  private async saveFirstChange(): Promise<void> {
    const change = this.changes[0];
    try {
      change.request ??= await this.createRequest(change);
    } catch {
      this.failure = { kind: 'rejected' };
      this.publishStatus();
      return;
    }

    let response: ProcessState;
    try {
      response = await this.dependencies.save(change.request);
    } catch (error) {
      this.retrying = false;
      this.handleSaveError(error);
      return;
    }

    this.retrying = false;
    const sentXml = change.request.bpmnXml ?? this.savedXml;
    this.version = response.version;
    this.savedXml = response.bpmnXml;
    // Importing replaces the diagram and its undo history, so do it only when the server changed the process.
    const imported = response.bpmnXml !== sentXml;
    if (imported && !(await this.importSavedChange(change, response))) return;
    this.changes.shift();
    change.onSuccess?.(imported);
    this.publishStatus();
  }

  private async createRequest(change: PendingChange): Promise<ProcessChange> {
    const bpmnXml = change.xml ? await change.xml : undefined;
    return {
      ...change.content,
      ...(bpmnXml === undefined ? {} : { bpmnXml }),
      expectedVersion: this.version,
    };
  }

  private async importSavedChange(change: PendingChange, response: ProcessState): Promise<boolean> {
    // The queued changes were captured from the diagram before this import, so they no longer apply.
    this.changes.splice(1);
    this.replacingDiagram = true;
    this.publishStatus();
    try {
      await this.dependencies.importState(response, change.content);
      return true;
    } catch {
      this.changes.length = 0;
      this.failure = { kind: 'loadFailed' };
      return false;
    } finally {
      this.replacingDiagram = false;
      this.publishStatus();
    }
  }

  private handleSaveError(error: unknown): void {
    const response = isAxiosError(error) ? error.response : undefined;
    if (response?.status === 400) {
      this.failure = { kind: 'rejected' };
    } else {
      // Other 409 responses, such as a git conflict, do not say whether the edit was applied.
      const isConflict =
        response?.status === 409 && response.data?.code === processStateConflictCode;
      this.failure = { kind: isConflict ? 'conflict' : 'lost' };
    }
    this.publishStatus();
  }

  private async loadSavedState(): Promise<void> {
    this.changes.length = 0;
    this.failure = undefined;
    this.replacingDiagram = true;
    this.publishStatus();
    try {
      const state = await this.dependencies.load();
      await this.dependencies.importState(state);
      this.version = state.version;
      this.savedXml = state.bpmnXml;
    } catch {
      this.failure = { kind: 'loadFailed' };
    } finally {
      this.replacingDiagram = false;
      this.publishStatus();
    }
  }

  private publishStatus(): void {
    const status = this.status;
    if (this.publishedStatus && isSameStatus(this.publishedStatus, status)) return;
    this.publishedStatus = status;
    this.dependencies.onStatusChange(status);
  }
}

function isSameStatus(a: ProcessSaveStatus, b: ProcessSaveStatus): boolean {
  return (
    a.pending === b.pending &&
    a.editingBlocked === b.editingBlocked &&
    a.failure?.kind === b.failure?.kind
  );
}

function canChangeProcessOnServer({ content, addsOrRemovesTasks }: QueuedProcessChange): boolean {
  return Boolean(addsOrRemovesTasks || content.metadata?.taskIdChange || content.layoutSetRename);
}
