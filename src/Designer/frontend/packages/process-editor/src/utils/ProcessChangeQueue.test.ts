import { waitFor } from '@testing-library/react';
import { ProcessChangeQueue, type QueuedProcessChange } from './ProcessChangeQueue';
import type { ProcessChange, ProcessState } from 'app-shared/types/api/ProcessState';

const initialState: ProcessState = { bpmnXml: '<initial />', version: 'initial-version' };
const reloadedState: ProcessState = { bpmnXml: '<reloaded />', version: 'reloaded-version' };
const rename = { taskIdChange: { oldId: 'Task_1', newId: 'NamedTask' } };
const subformPdfChange = {
  taskId: 'Task_1',
  componentId: 'component',
  sourceLayoutSetId: 'subform',
};

describe('ProcessChangeQueue', () => {
  it('saves snapshots in order using preceding response versions', async () => {
    const firstSave = deferred<ProcessState>();
    const { queue, save, status } = setup();
    save.mockReturnValueOnce(firstSave.promise);

    queue.enqueue(snapshot('<first />'));
    queue.enqueue(snapshot('<second />'));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(status()).toMatchObject({ pending: true, editingBlocked: false });

    firstSave.resolve({ bpmnXml: '<first />', version: 'first-version' });
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save.mock.calls[0][0]).toEqual({
      bpmnXml: '<first />',
      expectedVersion: 'initial-version',
    });
    expect(save.mock.calls[1][0]).toEqual({
      bpmnXml: '<second />',
      expectedVersion: 'first-version',
    });
    await waitFor(() => expect(status()).toEqual({ pending: false, editingBlocked: false }));

    queue.enqueue(snapshot('<renamed />', rename));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(3));
    expect(save.mock.calls[2][0]).toEqual({
      bpmnXml: '<renamed />',
      metadata: rename,
      expectedVersion: 'second-version',
    });
  });

  it('keeps metadata paired with deferred serialization', async () => {
    const firstSave = deferred<ProcessState>();
    const firstXml = deferred<string>();
    const { queue, save } = setup();
    save.mockReturnValueOnce(firstSave.promise);

    queue.enqueue(snapshot(firstXml.promise));
    queue.enqueue(snapshot('<second />', { subformPdfComponentChange: subformPdfChange }));
    firstXml.resolve('<first />');
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    firstSave.resolve({ bpmnXml: '<first />', version: 'first-version' });

    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save.mock.calls[0][0]).toEqual({
      bpmnXml: '<first />',
      expectedVersion: 'initial-version',
    });
    expect(save.mock.calls[1][0]).toEqual({
      bpmnXml: '<second />',
      metadata: { subformPdfComponentChange: subformPdfChange },
      expectedVersion: 'first-version',
    });
  });

  it('preserves the diagram when saved XML is unchanged', async () => {
    const onSuccess = jest.fn();
    const { queue, save, importState, status } = setup();

    queue.enqueue({ ...snapshot('<moved shape />'), onSuccess });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());

    expect(save).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(false);
    expect(importState).not.toHaveBeenCalled();
    expect(status()).toEqual({ pending: false, editingBlocked: false });
  });

  it('preserves the diagram when an explicit operation leaves XML unchanged', async () => {
    const onSuccess = jest.fn();
    const { queue, save, importState } = setup();

    queue.enqueue({ content: { layoutSetDeletion: { layoutSetIdToUpdate: 'Task_1' } }, onSuccess });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());

    expect(save).toHaveBeenCalledWith({
      layoutSetDeletion: { layoutSetIdToUpdate: 'Task_1' },
      expectedVersion: 'initial-version',
    });
    expect(importState).not.toHaveBeenCalled();
  });

  it('drops queued snapshots when importing server changes', async () => {
    const firstSave = deferred<ProcessState>();
    const droppedChangeSaved = jest.fn();
    const { queue, save, importState, status } = setup();
    save.mockReturnValueOnce(firstSave.promise);

    queue.enqueue(snapshot('<renamed />', rename));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(queue.enqueue(snapshot('<blocked />'))).toBe(false);
    const serverState: ProcessState = {
      bpmnXml: '<renamed by server />',
      version: 'renamed-version',
    };
    firstSave.resolve(serverState);
    await waitFor(() => expect(status().editingBlocked).toBe(false));
    expect(importState).toHaveBeenCalledWith(serverState, { metadata: rename });

    const importing = deferred<void>();
    importState.mockReturnValueOnce(importing.promise);
    const changedByServer: ProcessState = { bpmnXml: '<changed by server />', version: 'v2' };
    save.mockResolvedValueOnce(changedByServer);
    queue.enqueue(snapshot('<added task />'));
    queue.enqueue({ ...snapshot('<captured before import />'), onSuccess: droppedChangeSaved });
    await waitFor(() => expect(importState).toHaveBeenCalledWith(changedByServer, {}));
    expect(status()).toMatchObject({ pending: true, editingBlocked: true });
    importing.resolve();
    await waitFor(() => expect(status()).toEqual({ pending: false, editingBlocked: false }));

    expect(save).toHaveBeenCalledTimes(2);
    expect(droppedChangeSaved).not.toHaveBeenCalled();
    queue.enqueue(snapshot('<after import />'));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(3));
    expect(save.mock.lastCall[0]).toEqual({ bpmnXml: '<after import />', expectedVersion: 'v2' });
  });

  it.each<[string, QueuedProcessChange]>([
    [
      'a layout set rename',
      {
        content: {
          layoutSetRename: { layoutSetIdToUpdate: 'Task_1', newLayoutSetId: 'NamedTask' },
        },
      },
    ],
    ['a task change', { ...snapshot('<removed task />'), addsOrRemovesTasks: true }],
  ])('blocks %s until server changes finish importing', async (_, change) => {
    const importing = deferred<void>();
    const onSuccess = jest.fn();
    const { queue, save, importState, status } = setup();
    save.mockResolvedValueOnce({ bpmnXml: '<renamed by server />', version: 'renamed-version' });
    importState.mockReturnValueOnce(importing.promise);

    queue.enqueue({ ...change, onSuccess });
    expect(status().editingBlocked).toBe(true);
    await waitFor(() => expect(importState).toHaveBeenCalled());
    expect(importState.mock.lastCall[1]).toEqual(change.content);
    expect(
      queue.enqueue({ content: { layoutSetDeletion: { layoutSetIdToUpdate: 'Task_2' } } }),
    ).toBe(false);
    expect(status().editingBlocked).toBe(true);

    importing.resolve();
    await waitFor(() => expect(status().editingBlocked).toBe(false));
    expect(save).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(true);
  });

  it.each<[string, QueuedProcessChange]>([
    ['a property edit', snapshot('<edited property />')],
    [
      'a subform PDF component change',
      snapshot('<subform pdf />', { subformPdfComponentChange: subformPdfChange }),
    ],
    [
      'a layout set creation',
      { content: { layoutSetCreation: { layoutSetConfig: { id: 'Task_2', taskId: 'Task_2' } } } },
    ],
    [
      'a layout set deletion',
      { content: { layoutSetDeletion: { layoutSetIdToUpdate: 'Task_1' } } },
    ],
    [
      'a data types change',
      { content: { dataTypesChange: { connectedTaskId: 'Task_1', newDataTypes: ['model'] } } },
    ],
  ])('does not block editing while saving %s', async (_, change) => {
    const pendingSave = deferred<ProcessState>();
    const { queue, save, status } = setup();
    save.mockReturnValueOnce(pendingSave.promise);

    queue.enqueue(change);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));

    expect(status()).toEqual({ pending: true, editingBlocked: false });
    expect(queue.enqueue(snapshot('<next edit />'))).toBe(true);
  });

  it('waits for discard after validation rejects a save', async () => {
    const firstSave = deferred<ProcessState>();
    const { queue, save, load, importState, status } = setup();
    save.mockReturnValueOnce(firstSave.promise);

    queue.enqueue(snapshot('<invalid />'));
    queue.enqueue(snapshot('<built on invalid />'));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    firstSave.reject(axiosError(400));

    await waitFor(() => expect(status().failure).toEqual({ kind: 'rejected' }));
    expect(status().editingBlocked).toBe(true);
    expect(load).not.toHaveBeenCalled();
    expect(importState).not.toHaveBeenCalled();
    expect(queue.enqueue(snapshot('<blocked />'))).toBe(false);
    queue.retry();
    expect(save).toHaveBeenCalledTimes(1);

    await queue.discard();
    expect(importState).toHaveBeenCalledWith(reloadedState);
    expect(load).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(status()).toEqual({ pending: false, editingBlocked: false }));
    expect(save).toHaveBeenCalledTimes(1);

    queue.enqueue(snapshot('<after reload />'));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save.mock.lastCall[0]).toEqual({
      bpmnXml: '<after reload />',
      expectedVersion: reloadedState.version,
    });
  });

  it('waits for discard after serialization fails without writing', async () => {
    const { queue, save, load, importState, status } = setup();

    queue.enqueue(snapshot(Promise.reject(new Error('Cannot serialize'))));
    queue.enqueue(snapshot('<built on unserializable />'));

    await waitFor(() => expect(status().failure).toEqual({ kind: 'rejected' }));
    expect(status().editingBlocked).toBe(true);
    expect(load).not.toHaveBeenCalled();
    expect(importState).not.toHaveBeenCalled();
    queue.retry();
    expect(save).not.toHaveBeenCalled();

    await queue.discard();
    expect(importState).toHaveBeenCalledWith(reloadedState);
    expect(status()).toEqual({ pending: false, editingBlocked: false });
  });

  it('waits for reload after a process-state conflict', async () => {
    const firstSave = deferred<ProcessState>();
    const { queue, save, importState, status } = setup();
    save.mockReturnValueOnce(firstSave.promise);
    queue.enqueue(snapshot('<first />'));
    queue.enqueue(snapshot('<second />'));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));

    firstSave.reject(conflictError());
    await waitFor(() => expect(status().failure).toEqual({ kind: 'conflict' }));
    expect(status()).toMatchObject({ pending: false, editingBlocked: true });
    queue.retry();
    expect(queue.enqueue(snapshot('<blocked />'))).toBe(false);
    expect(save).toHaveBeenCalledTimes(1);

    importState.mockRejectedValueOnce(new Error('Import failed'));
    await queue.discard();
    expect(status()).toEqual({
      pending: false,
      editingBlocked: true,
      failure: { kind: 'loadFailed' },
    });
    await queue.discard();
    expect(status()).toEqual({ pending: false, editingBlocked: false });
    expect(save).toHaveBeenCalledTimes(1);

    queue.enqueue(snapshot('<new edit />'));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save.mock.lastCall[0]).toEqual({
      bpmnXml: '<new edit />',
      expectedVersion: reloadedState.version,
    });
  });

  it('retries an unanswered request before sending later edits', async () => {
    const firstSave = deferred<ProcessState>();
    const retrySave = deferred<ProcessState>();
    const { queue, save, status } = setup();
    save.mockReturnValueOnce(firstSave.promise).mockReturnValueOnce(retrySave.promise);
    queue.enqueue(snapshot('<first />'));
    queue.enqueue(snapshot('<second />'));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));

    firstSave.reject(new Error('Network Error'));
    await waitFor(() => expect(status().failure).toEqual({ kind: 'lost' }));
    expect(status()).toMatchObject({ pending: false, editingBlocked: true });
    expect(queue.enqueue(snapshot('<blocked />'))).toBe(false);

    queue.retry();
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save.mock.calls[1][0]).toBe(save.mock.calls[0][0]);
    expect(save.mock.calls[1][0].expectedVersion).toBe('initial-version');
    expect(status()).toEqual({ pending: true, editingBlocked: true });

    retrySave.resolve({ bpmnXml: '<first />', version: 'first-version' });
    await waitFor(() => expect(save).toHaveBeenCalledTimes(3));
    expect(save.mock.lastCall[0]).toEqual({
      bpmnXml: '<second />',
      expectedVersion: 'first-version',
    });
    await waitFor(() => expect(status()).toEqual({ pending: false, editingBlocked: false }));
  });

  it('treats a 409 without the process state conflict code as a lost response', async () => {
    const { queue, save, status } = setup();
    const gitConflict = axiosError(409, { status: 409, errorCode: 'GT_01' });
    save.mockRejectedValueOnce(gitConflict).mockResolvedValueOnce({
      bpmnXml: '<first />',
      version: 'first-version',
    });
    queue.enqueue(snapshot('<first />'));

    await waitFor(() => expect(status().failure).toEqual({ kind: 'lost' }));
    expect(status().editingBlocked).toBe(true);

    queue.retry();
    await waitFor(() => expect(status()).toEqual({ pending: false, editingBlocked: false }));
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('treats a retry that the server already applied as a conflict', async () => {
    const { queue, save, status } = setup();
    save.mockRejectedValueOnce(new Error('Network Error')).mockRejectedValueOnce(conflictError());
    queue.enqueue(snapshot('<first />'));
    await waitFor(() => expect(status().failure).toEqual({ kind: 'lost' }));

    queue.retry();

    await waitFor(() => expect(status().failure).toEqual({ kind: 'conflict' }));
    expect(save).toHaveBeenCalledTimes(2);
    expect(status().editingBlocked).toBe(true);
  });

  it('discards a lost edit by reloading the saved process', async () => {
    const { queue, save, load, importState, status } = setup();
    save.mockRejectedValueOnce(new Error('Network Error'));
    queue.enqueue(snapshot('<first />'));
    queue.enqueue(snapshot('<second />'));
    await waitFor(() => expect(status().failure).toEqual({ kind: 'lost' }));

    await queue.discard();

    expect(load).toHaveBeenCalledTimes(1);
    expect(importState).toHaveBeenCalledWith(reloadedState);
    expect(save).toHaveBeenCalledTimes(1);
    expect(status()).toEqual({ pending: false, editingBlocked: false });
  });

  it('publishes only changed status', async () => {
    const firstSave = deferred<ProcessState>();
    const { queue, save, onStatusChange } = setup();
    save.mockReturnValueOnce(firstSave.promise);

    queue.enqueue(snapshot('<first />'));
    queue.enqueue(snapshot('<second />'));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(onStatusChange.mock.calls).toEqual([[{ pending: true, editingBlocked: false }]]);

    firstSave.resolve({ bpmnXml: '<first />', version: 'first-version' });
    await waitFor(() => expect(onStatusChange).toHaveBeenCalledTimes(2));
    expect(save).toHaveBeenCalledTimes(2);
    expect(onStatusChange.mock.lastCall[0]).toEqual({ pending: false, editingBlocked: false });
  });

  it('reloads after a failed import without repeating the saved request', async () => {
    const { queue, save, load, importState, status } = setup();
    const savedState: ProcessState = {
      bpmnXml: '<renamed by server />',
      version: 'renamed-version',
    };
    save.mockResolvedValueOnce(savedState);
    importState.mockRejectedValueOnce(new Error('Import failed'));

    queue.enqueue(snapshot('<renamed />', rename));
    await waitFor(() => expect(status().failure).toEqual({ kind: 'loadFailed' }));
    expect(status().editingBlocked).toBe(true);
    queue.retry();
    expect(save).toHaveBeenCalledTimes(1);

    load.mockResolvedValueOnce(savedState);
    await queue.discard();
    expect(save).toHaveBeenCalledTimes(1);
    expect(importState).toHaveBeenCalledTimes(2);
    expect(importState.mock.lastCall).toEqual([savedState]);
    expect(status()).toEqual({ pending: false, editingBlocked: false });
  });
});

function snapshot(
  xml: string | Promise<string>,
  metadata?: QueuedProcessChange['content']['metadata'],
): QueuedProcessChange {
  return {
    content: metadata ? { metadata } : {},
    xml: typeof xml === 'string' ? Promise.resolve(xml) : xml,
  };
}

function setup() {
  const save = jest
    .fn<Promise<ProcessState>, [ProcessChange]>()
    .mockImplementation(async (change) => ({
      bpmnXml: change.bpmnXml ?? initialState.bpmnXml,
      version: versionOf(change.bpmnXml),
    }));
  const load = jest.fn<Promise<ProcessState>, []>().mockResolvedValue(reloadedState);
  const importState = jest
    .fn<Promise<void>, [ProcessState, QueuedProcessChange['content']?]>()
    .mockResolvedValue(undefined);
  const onStatusChange = jest.fn();
  const queue = new ProcessChangeQueue(initialState, {
    save,
    load,
    importState,
    onStatusChange,
  });
  return {
    queue,
    save,
    load,
    importState,
    onStatusChange,

    status: () => {
      expect(onStatusChange.mock.lastCall?.[0]).toEqual(queue.status);
      return queue.status;
    },
  };
}

function versionOf(bpmnXml?: string): string {
  return bpmnXml ? `${bpmnXml.replace(/[<>/ ]/g, '')}-version` : 'explicit-version';
}

function axiosError(status: number, data?: unknown) {
  return { isAxiosError: true, response: { status, data } };
}

function conflictError() {
  return axiosError(409, { code: 'process_state_conflict', message: 'The process has changed.' });
}

function deferred<T>() {
  let resolve: (value: T) => void;
  let reject: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
