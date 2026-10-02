import type { MutableRefObject, ReactNode } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryObserver } from '@tanstack/react-query';
import { Injector } from 'didi';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { MetadataForm } from 'app-shared/types/BpmnMetadataForm';
import type { ProcessChange, ProcessState } from 'app-shared/types/api/ProcessState';
import { processDependencyQueryKeys } from 'app-shared/queryInvalidator/processDependencyQueryKeys';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { org, app } from '@studio/testing/testids';
import { createBpmnTestModeler } from '../../test/createBpmnTestModeler';
import {
  BpmnApiContextProvider,
  useBpmnApiContext,
  type BpmnApiContextProps,
} from '../contexts/BpmnApiContext';
import { useBpmnConfigPanelFormContext } from '../contexts/BpmnConfigPanelContext';
import { EditRunDefaultValidator } from '../components/ConfigPanel/ConfigContent/EditRunDefaultValidator/EditRunDefaultValidator';
import { useProcessOperations } from './useProcessOperations';
import { useUpdateLayoutSetId } from './useUpdateLayoutSetId';
import UpdateTaskIdCommandHandlerModule from '../commandHandlers/UpdateTaskIdCommandHandler';

const initialState: ProcessState = { bpmnXml: '<initial />', version: 'initial-version' };
const savedState: ProcessState = { bpmnXml: '<saved />', version: 'saved-version' };
const label = textMock('process_editor.configuration_panel_run_default_validator_label');
const subformPdfComponentChange: MetadataForm['subformPdfComponentChange'] = {
  taskId: 'Task_1',
  componentId: 'vehicles',
  sourceLayoutSetId: 'Task_2',
};

describe('useProcessOperations', () => {
  beforeEach(jest.clearAllMocks);

  it('saves config snapshots in order with confirmed versions', async () => {
    const user = userEvent.setup();
    const firstSave = deferred<ProcessState>();
    const updateProcessState = jest
      .fn<Promise<ProcessState>, [string, string, ProcessChange]>()
      .mockReturnValueOnce(firstSave.promise)
      .mockImplementation(async (_org, _app, change) => ({
        bpmnXml: change.bpmnXml,
        version: 'second-version',
      }));
    const { emitCommandStackChanged, queryClient } = renderProcessOperations({
      updateProcessState,
      children: <EditRunDefaultValidator />,
    });

    await user.click(screen.getByLabelText(label));
    act(() => emitCommandStackChanged());
    await waitFor(() => expect(updateProcessState).toHaveBeenCalledTimes(1));
    const firstChange = updateProcessState.mock.calls[0][2];
    expect(firstChange).toMatchObject({ expectedVersion: initialState.version });
    expect(firstChange).not.toHaveProperty('metadata');
    expect(firstChange.bpmnXml).toContain(
      '<altinn:runDefaultValidator>true</altinn:runDefaultValidator>',
    );

    await user.click(screen.getByLabelText(label));
    act(() => emitCommandStackChanged());
    expect(updateProcessState).toHaveBeenCalledTimes(1);
    act(() => firstSave.resolve({ bpmnXml: firstChange.bpmnXml, version: 'first-version' }));

    await waitFor(() => expect(updateProcessState).toHaveBeenCalledTimes(2));
    const secondChange = updateProcessState.mock.calls[1][2];
    expect(secondChange).toMatchObject({ expectedVersion: 'first-version' });
    expect(secondChange.bpmnXml).toContain(
      '<altinn:runDefaultValidator>false</altinn:runDefaultValidator>',
    );
    expect(secondChange.bpmnXml).toContain(
      '<altinn:signatureDataType>signatures</altinn:signatureDataType>',
    );
    await waitFor(() =>
      expect(queryClient.getQueryData([QueryKey.ProcessState, org, app])).toEqual({
        bpmnXml: secondChange.bpmnXml,
        version: 'second-version',
      }),
    );
    expect(queryClient.getQueryData([QueryKey.FetchBpmn, org, app])).toBe(secondChange.bpmnXml);
  });

  it.each<[string, (view: Fixture) => void]>([
    ['adds a task', (view) => view.commandStack.execute('test.addTask', { id: 'Task_2' })],
    [
      'removes a task',
      (view) =>
        view.commandStack.execute('test.deleteTask', { element: addTask(view, 'Task_2', 'data') }),
    ],
    [
      'has metadata',
      (view) =>
        view.commandStack.execute('test.setName', {
          name: 'Configured',
          metadata: { subformPdfComponentChange },
        }),
    ],
    [
      'is an explicit operation',
      (view) => view.editor.api.deleteLayoutSet({ layoutSetIdToUpdate: 'Task_1' }),
    ],
  ])('refreshes dependencies after a save that %s', async (_, edit) => {
    const updateProcessState = jest.fn().mockImplementation(echoSave);
    const view = renderProcessOperations({ updateProcessState });
    const { editor, queryClient, commandStack, importXML } = view;
    const invalidateQueries = jest
      .spyOn(queryClient, 'invalidateQueries')
      .mockReturnValue(new Promise(() => {}));
    registerSetNameCommand(view);
    registerAddCommand(view);
    registerDeleteCommand(view);

    act(() => edit(view));

    await waitFor(() => expectDependenciesRefreshed(invalidateQueries, 1));
    expect(updateProcessState).toHaveBeenCalledTimes(1);
    expect(editor.api.pendingApiOperations).toBe(false);
    expect(commandStack.readOnly).toBe(false);
    expect(importXML).not.toHaveBeenCalled();
  });

  it('saves a property edit without importing or refreshing dependencies', async () => {
    const updateProcessState = jest.fn().mockImplementation(echoSave);
    const view = renderProcessOperations({ updateProcessState });
    const { editor, queryClient, commandStack, importXML } = view;
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    registerSetNameCommand(view);

    act(() => commandStack.execute('test.setName', { name: 'Moved or renamed' }));

    await waitFor(() => expect(updateProcessState).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(editor.api.pendingApiOperations).toBe(false));
    expectDependenciesRefreshed(invalidateQueries, 0);
    expect(importXML).not.toHaveBeenCalled();
    expect(commandStack.canUndo()).toBe(true);
  });

  it('refreshes dependencies once before importing server changes', async () => {
    const importing = deferred<{ warnings: [] }>();
    const updateProcessState = jest.fn().mockResolvedValue(renamedState('NamedTask'));
    const { editor, queryClient, importXML } = renderProcessOperations({ updateProcessState });
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    importXML.mockReturnValueOnce(importing.promise);

    act(() => editor.updateLayoutSetId('Task_1', 'NamedTask'));

    await waitFor(() => expect(importXML).toHaveBeenCalledWith(renamedState('NamedTask').bpmnXml));
    expectDependenciesRefreshed(invalidateQueries, 1);
    await act(async () => importing.resolve({ warnings: [] }));
    expectDependenciesRefreshed(invalidateQueries, 1);
  });

  it('imports server changes even when a dependency refresh fails', async () => {
    const updateProcessState = jest.fn().mockResolvedValue(renamedState('NamedTask'));
    const { editor, queryClient, commandStack, importXML } = renderProcessOperations({
      updateProcessState,
    });
    const getLayoutSets = jest.fn().mockRejectedValue(new Error('Cannot load the layout sets'));
    const layoutSets = new QueryObserver(queryClient, {
      queryKey: [QueryKey.LayoutSets, org, app],
      queryFn: getLayoutSets,
    });
    const unsubscribe = layoutSets.subscribe(() => {});
    await waitFor(() => expect(getLayoutSets).toHaveBeenCalledTimes(1));

    act(() => editor.updateLayoutSetId('Task_1', 'NamedTask'));

    await waitFor(() => expect(importXML).toHaveBeenCalledWith(renamedState('NamedTask').bpmnXml));
    expect(getLayoutSets).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(commandStack.readOnly).toBe(false));
    expect(editor.api.pendingApiOperations).toBe(false);
    unsubscribe();
  });

  describe('when a task is renamed', () => {
    it('blocks task deletion during a rename', async () => {
      const rename = deferred<ProcessState>();
      const updateProcessState = jest
        .fn()
        .mockReturnValueOnce(rename.promise)
        .mockImplementation(echoSave);
      const view = renderProcessOperations({ updateProcessState });
      const { editor, commandStack, elements, importXML } = view;
      const otherTask = addTask(view, 'Task_2', 'data');
      registerDeleteCommand(view);

      act(() => editor.updateLayoutSetId('Task_1', 'NamedTask'));
      act(() => commandStack.execute('test.deleteTask', { element: otherTask }));

      expect(commandStack.readOnly).toBe(true);
      expect(elements).toContain(otherTask);
      await waitFor(() => expect(updateProcessState).toHaveBeenCalledTimes(1));
      expect(updateProcessState.mock.calls[0][2]).toEqual({
        layoutSetRename: { layoutSetIdToUpdate: 'Task_1', newLayoutSetId: 'NamedTask' },
        expectedVersion: initialState.version,
      });

      await act(async () => rename.resolve(renamedState('NamedTask')));
      await waitFor(() => expect(commandStack.readOnly).toBe(false));
      expect(importXML).toHaveBeenCalledTimes(1);
      expect(elements).toContain(otherTask);
      expect(updateProcessState).toHaveBeenCalledTimes(1);

      act(() => commandStack.execute('test.deleteTask', { element: otherTask }));
      expect(elements).not.toContain(otherTask);
      await waitFor(() => expect(updateProcessState).toHaveBeenCalledTimes(2));
      expect(updateProcessState.mock.calls[1][2]).toMatchObject({
        expectedVersion: renamedState('NamedTask').version,
      });
    });

    it('accepts another rename only after importing the first', async () => {
      const updateProcessState = jest
        .fn()
        .mockResolvedValueOnce(renamedState('FirstName'))
        .mockResolvedValueOnce(renamedState('SecondName'));
      const { editor, commandStack, importXML, selection, element } = renderProcessOperations({
        updateProcessState,
      });
      act(() => selection.select(element));

      act(() => editor.updateLayoutSetId('Task_1', 'FirstName'));
      act(() => editor.updateLayoutSetId('Task_1', 'Ignored'));
      await waitFor(() => expect(importXML).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(commandStack.readOnly).toBe(false));
      act(() => editor.updateLayoutSetId('FirstName', 'SecondName'));
      await waitFor(() => expect(importXML).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(commandStack.readOnly).toBe(false));

      expect(updateProcessState).toHaveBeenCalledTimes(2);
      expect(updateProcessState.mock.calls[0][2]).toEqual({
        layoutSetRename: { layoutSetIdToUpdate: 'Task_1', newLayoutSetId: 'FirstName' },
        expectedVersion: initialState.version,
      });
      expect(updateProcessState.mock.calls[1][2]).toEqual({
        layoutSetRename: { layoutSetIdToUpdate: 'FirstName', newLayoutSetId: 'SecondName' },
        expectedVersion: renamedState('FirstName').version,
      });
      expect(importXML).toHaveBeenNthCalledWith(1, renamedState('FirstName').bpmnXml);
      expect(importXML).toHaveBeenNthCalledWith(2, renamedState('SecondName').bpmnXml);
    });
  });

  describe('when a task ID change is undone or redone', () => {
    it('saves undo as a reverse rename and waits for confirmation', async () => {
      const undoSave = deferred<ProcessState>();
      const updateProcessState = jest
        .fn()
        .mockImplementationOnce(echoSave)
        .mockReturnValueOnce(undoSave.promise);
      const view = renderProcessOperations({ updateProcessState });
      const { commandStack, element, importXML } = view;
      registerUpdateTaskIdCommand(view);

      act(() => commandStack.execute('updateTaskId', { element, newId: 'NamedTask' }));
      await waitFor(() => expect(updateProcessState).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(commandStack.readOnly).toBe(false));
      act(() => commandStack.undo());
      expect(commandStack.readOnly).toBe(true);

      await waitFor(() => expect(updateProcessState).toHaveBeenCalledTimes(2));
      const [rename, undo] = updateProcessState.mock.calls.map(([, , change]) => change);
      expect(rename.metadata).toEqual({ taskIdChange: { oldId: 'Task_1', newId: 'NamedTask' } });
      expect(rename.bpmnXml).toContain('id="NamedTask"');
      expect(undo.metadata).toEqual({ taskIdChange: { oldId: 'NamedTask', newId: 'Task_1' } });
      expect(undo.bpmnXml).toContain('id="Task_1"');
      expect(undo.expectedVersion).toBe(`after-${initialState.version}`);
      await act(async () => undoSave.resolve(await echoSave(org, app, undo)));
      await waitFor(() => expect(commandStack.readOnly).toBe(false));
      expect(importXML).not.toHaveBeenCalled();
      expect(commandStack.canRedo()).toBe(true);
    });

    it('saves redo with the original rename metadata', async () => {
      const updateProcessState = jest.fn().mockImplementation(echoSave);
      const view = renderProcessOperations({ updateProcessState });
      const { commandStack, element, importXML } = view;
      registerUpdateTaskIdCommand(view);

      act(() => commandStack.execute('updateTaskId', { element, newId: 'NamedTask' }));
      await waitFor(() => expect(commandStack.readOnly).toBe(false));
      act(() => commandStack.undo());
      await waitFor(() => expect(updateProcessState).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(commandStack.readOnly).toBe(false));
      act(() => commandStack.redo());

      await waitFor(() => expect(updateProcessState).toHaveBeenCalledTimes(3));
      const redo = updateProcessState.mock.calls[2][2];
      expect(redo.metadata).toEqual({ taskIdChange: { oldId: 'Task_1', newId: 'NamedTask' } });
      expect(redo.bpmnXml).toContain('id="NamedTask"');
      await waitFor(() => expect(commandStack.readOnly).toBe(false));
      expect(importXML).not.toHaveBeenCalled();
      expect(commandStack.canUndo()).toBe(true);
    });

    it('omits metadata from ignored rename commands', async () => {
      const rename = deferred<ProcessState>();
      const updateProcessState = jest
        .fn()
        .mockReturnValueOnce(rename.promise)
        .mockImplementation(echoSave);
      const view = renderProcessOperations({ updateProcessState });
      const { commandStack, element, editor } = view;
      registerUpdateTaskIdCommand(view);
      registerSetNameCommand(view);

      act(() => commandStack.execute('updateTaskId', { element, newId: 'NamedTask' }));
      act(() => commandStack.execute('updateTaskId', { element, newId: 'Ignored' }));
      expect(editor.metadataFormRef.current).toBeUndefined();
      await waitFor(() => expect(updateProcessState).toHaveBeenCalledTimes(1));
      await act(async () =>
        rename.resolve(await echoSave(org, app, updateProcessState.mock.calls[0][2])),
      );
      await waitFor(() => expect(commandStack.readOnly).toBe(false));
      act(() => commandStack.execute('test.setName', { name: 'Next edit' }));

      await waitFor(() => expect(updateProcessState).toHaveBeenCalledTimes(2));
      expect(updateProcessState.mock.calls[1][2]).not.toHaveProperty('metadata');
      expect(updateProcessState.mock.calls[1][2].bpmnXml).toContain('id="NamedTask"');
    });
  });

  it('waits for server cleanup before allowing edits after task deletion', async () => {
    const saving = deferred<ProcessState>();
    const importing = deferred<{ warnings: [] }>();
    const updateProcessState = jest.fn().mockReturnValueOnce(saving.promise);
    const view = renderProcessOperations({ updateProcessState });
    setSigningTask(view, view.businessObject, 'signatures-1', ['signatures-2']);
    const deletedTask = addTask(view, 'Task_2', 'signing');
    setSigningTask(view, deletedTask.businessObject, 'signatures-2', []);
    registerDeleteCommand(view);
    registerSetNameCommand(view);
    view.importXML.mockReturnValueOnce(importing.promise);

    act(() => view.commandStack.execute('test.deleteTask', { element: deletedTask }));
    expect(view.commandStack.readOnly).toBe(true);
    act(() => view.commandStack.execute('test.setName', { name: 'Blocked edit' }));
    await waitFor(() => expect(updateProcessState).toHaveBeenCalledTimes(1));
    const sentXml = updateProcessState.mock.calls[0][2].bpmnXml;
    const signatureReference = '<altinn:dataType>signatures-2</altinn:dataType>';
    expect(sentXml).toContain(signatureReference);
    expect(sentXml).not.toContain('Blocked edit');
    const serverState: ProcessState = {
      bpmnXml: sentXml.replace(signatureReference, ''),
      version: 'cleaned-version',
    };

    await act(async () => saving.resolve(serverState));
    await waitFor(() => expect(view.importXML).toHaveBeenCalledWith(serverState.bpmnXml));
    expect(view.commandStack.readOnly).toBe(true);
    await act(async () => importing.resolve({ warnings: [] }));
    await waitFor(() => expect(view.commandStack.readOnly).toBe(false));
    expect(updateProcessState).toHaveBeenCalledTimes(1);
  });
});

type Fixture = ReturnType<typeof renderProcessOperations>;
type TestTask = Fixture['elements'][number];
type Editor = {
  api?: Partial<BpmnApiContextProps>;
  metadataFormRef?: MutableRefObject<MetadataForm>;
  updateLayoutSetId?: ReturnType<typeof useUpdateLayoutSetId>;
};

type RenderProps = {
  updateProcessState?: jest.Mock;
  load?: jest.Mock;
  children?: ReactNode;
};

function renderProcessOperations({
  updateProcessState = jest.fn().mockImplementation(echoSave),
  load = jest.fn().mockResolvedValue(savedState),
  children,
}: RenderProps = {}) {
  const queryClient = createQueryClientMock();
  const fixture = createBpmnTestModeler('bpmn:Task');
  setSigningTask(fixture, fixture.businessObject, 'signatures', []);
  const editor: Editor = {};

  function OperationsProvider({ children: content }: { children: ReactNode }) {
    const {
      status,
      retry: _retry,
      discard: _discard,
      ...operations
    } = useProcessOperations({ initialState, org, app, load });
    return (
      <BpmnApiContextProvider {...operations} pendingApiOperations={status.pending}>
        {content}
      </BpmnApiContextProvider>
    );
  }

  function EditorProbe() {
    editor.api = useBpmnApiContext();
    editor.metadataFormRef = useBpmnConfigPanelFormContext().metadataFormRef;
    editor.updateLayoutSetId = useUpdateLayoutSetId();
    return null;
  }

  render(
    <ServicesContextProvider
      {...queriesMock}
      updateProcessState={updateProcessState}
      client={queryClient}
    >
      <fixture.Wrapper apiProvider={OperationsProvider}>
        <EditorProbe />
        {children}
      </fixture.Wrapper>
    </ServicesContextProvider>,
  );
  return { ...fixture, editor, queryClient };
}

function registerSetNameCommand(fixture: Fixture): void {
  fixture.commandStack.register('test.setName', {
    execute: (context: { name: string; metadata?: MetadataForm }) => {
      if (context.metadata) fixture.editor.metadataFormRef.current = context.metadata;
      fixture.businessObject.name = context.name;
      return [];
    },
    revert: () => [],
  });
}

function registerAddCommand(fixture: Fixture): void {
  fixture.commandStack.register('test.addTask', {
    execute: (context: { id: string; element?: TestTask }) => {
      context.element ??= addTask(fixture, context.id, 'data');
      fixture.emit('shape.added', { element: context.element });
      return [];
    },
    revert: ({ element }: { element: TestTask }) => {
      fixture.elements.splice(fixture.elements.indexOf(element), 1);
      return [];
    },
  });
}

// Nested ID commands let the real rename handler participate in undo/redo.
function registerUpdateTaskIdCommand(fixture: Fixture): void {
  const { commandStack, modelerRef } = fixture;
  type SetIdContext = { element: TestTask; id: string; previousId?: string };
  const setId = (element: TestTask, id: string): void => {
    element.id = id;
    element.businessObject.id = id;
  };
  commandStack.register('test.setId', {
    execute: (context: SetIdContext) => {
      context.previousId = context.element.id;
      setId(context.element, context.id);
      return [];
    },
    revert: (context: SetIdContext) => {
      setId(context.element, context.previousId);
      return [];
    },
  });
  const modeling = {
    updateProperties: (element: TestTask, { id }: { id: string }) =>
      commandStack.execute('test.setId', { element, id }),
    updateModdleProperties: jest.fn(),
  };
  new Injector([
    {
      commandStack: ['value', commandStack],
      elementRegistry: ['value', modelerRef.current.get('elementRegistry')],
      modeling: ['value', modeling],
    },
    UpdateTaskIdCommandHandlerModule,
  ]).init();
}

function registerDeleteCommand(fixture: Fixture): void {
  fixture.commandStack.register('test.deleteTask', {
    execute: ({ element }: { element: TestTask }) => {
      fixture.emit('shape.remove', { element });
      fixture.elements.splice(fixture.elements.indexOf(element), 1);
      return [];
    },
    revert: ({ element }: { element: TestTask }) => {
      fixture.elements.push(element);
      return [];
    },
  });
}

function addTask(fixture: Fixture, id: string, taskType: string): TestTask {
  const businessObject = fixture.moddle.create('bpmn:Task', { id }) as TestTask['businessObject'];
  businessObject.extensionElements = fixture.moddle.create('bpmn:ExtensionElements', {
    values: [fixture.moddle.create('altinn:TaskExtension', { taskType })],
  });
  const task: TestTask = { id, type: 'bpmn:Task', businessObject };
  fixture.elements.push(task);
  return task;
}

function setSigningTask(
  fixture: Pick<Fixture, 'moddle'>,
  businessObject: TestTask['businessObject'],
  signatureDataType: string,
  uniqueFromSignatures: string[],
): void {
  const { moddle } = fixture;
  businessObject.extensionElements = moddle.create('bpmn:ExtensionElements', {
    values: [
      moddle.create('altinn:TaskExtension', {
        taskType: 'signing',
        signatureConfig: moddle.create('altinn:SignatureConfig', {
          signatureDataType,
          ...(uniqueFromSignatures.length && {
            uniqueFromSignaturesInDataTypes: moddle.create(
              'altinn:UniqueFromSignaturesInDataTypes',
              {
                dataTypes: uniqueFromSignatures.map((dataType) =>
                  moddle.create('altinn:DataType', { dataType }),
                ),
              },
            ),
          }),
        }),
      }),
    ],
  });
}

function expectDependenciesRefreshed(invalidateQueries: jest.SpyInstance, times: number): void {
  processDependencyQueryKeys.forEach((key) =>
    expect(
      invalidateQueries.mock.calls.filter(([filters]) => filters.queryKey[0] === key),
    ).toHaveLength(times),
  );
}

async function echoSave(_org: string, _app: string, change: ProcessChange): Promise<ProcessState> {
  return {
    bpmnXml: change.bpmnXml ?? initialState.bpmnXml,
    version: `after-${change.expectedVersion}`,
  };
}

function renamedState(newId: string): ProcessState {
  return { bpmnXml: `<renamed to="${newId}" />`, version: `${newId}-version` };
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
