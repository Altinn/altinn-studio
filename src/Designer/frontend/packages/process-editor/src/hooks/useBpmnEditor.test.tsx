import React from 'react';
import type { RenderHookResult } from '@testing-library/react';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { UseBpmnEditorResult } from './useBpmnEditor';
import { useBpmnEditor } from './useBpmnEditor';
import { useUpdateLayoutSetId } from './useUpdateLayoutSetId';
import type { BpmnContextProps, BpmnContextProviderProps } from '../contexts/BpmnContext';
import { BpmnContextProvider, useBpmnContext } from '../contexts/BpmnContext';
import type { BpmnApiContextProps } from '../contexts/BpmnApiContext';
import { BpmnApiContextProvider } from '../contexts/BpmnApiContext';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { mockBpmnDetails } from '../../test/mocks/bpmnDetailsMock';
import { StudioRecommendedNextActionContextProvider } from '@studio/components';
import {
  BpmnConfigPanelFormContextProvider,
  useBpmnConfigPanelFormContext,
} from '../contexts/BpmnConfigPanelContext';
import type { MetadataForm } from 'app-shared/types/BpmnMetadataForm';
import type { TaskEvent } from '../types/TaskEvent';
import { EventListeners } from '../../test/EventListeners';
import type {
  BpmnBusinessObjectEditor,
  BpmnExtensionElementsEditor,
} from '../types/BpmnBusinessObjectEditor';
import { BpmnTypeEnum } from '../enum/BpmnTypeEnum';
import type { BpmnTaskType } from '../types/BpmnTaskType';
import type { OnProcessTaskEvent } from '../types/OnProcessTask';
import type { SelectionChangedEvent } from '../types/SelectionChangeEvent';
import type BpmnModeler from 'bpmn-js/lib/Modeler';
import type { AppVersion } from 'app-shared/types/AppVersion';

// Test data:
const appVersion: AppVersion = {
  backendVersion: '8.0.0',
  frontendVersion: '4.0.0',
};
const v9AppVersion: AppVersion = {
  backendVersion: '9.0.0',
  frontendVersion: '4.0.0',
};
const defaultBpmnContextProps: Omit<BpmnContextProviderProps, 'children'> = {
  appVersion,
  bpmnXml: undefined,
};
const savedXml = '<savedxml></savedxml>';
const taskIdChange = { oldId: 'Task_1', newId: 'Task_2' };
const layoutSetId = 'someLayoutSetId';
const layoutSets: LayoutSets = [
  {
    id: layoutSetId,
    taskId: mockBpmnDetails.id,
  },
];

const defaultBpmnApiContextProps: BpmnApiContextProps = {
  availableDataTypeIds: [],
  availableDataModelIds: [],
  allDataModelIds: [],
  layoutSets,
  pendingApiOperations: false,
  existingCustomReceiptLayoutSetId: undefined,
  addLayoutSet: jest.fn(),
  deleteLayoutSet: jest.fn(),
  mutateLayoutSetId: jest.fn(),
  mutateDataTypes: jest.fn(),
  saveBpmn: jest.fn(),
  getSavedBpmn: jest.fn(),
  onProcessTaskAdd: jest.fn(),
  onProcessTaskRemove: jest.fn(),
};
const taskType: BpmnTaskType = 'data';
const extensionElements: BpmnExtensionElementsEditor = {
  values: [
    {
      $type: 'altinn:TaskExtension',
      taskType,
    },
  ],
};
const businessObject: BpmnBusinessObjectEditor = {
  $type: BpmnTypeEnum.Task,
  id: 'test',
  extensionElements,
};
const element: TaskEvent['element'] = {
  id: 'test',
  businessObject,
};
const xml = '<testxml></testxml>';

// Mocks:
jest.mock('bpmn-js/lib/Modeler', () => jest.fn().mockImplementation(bpmnModelerImplementation));

function bpmnModelerImplementation(): BpmnModeler {
  return {
    get: getModeler,
    importXML,
    on,
    off,
    saveXML,
    attachTo: jest.fn(),
    clear: jest.fn(),
    createDiagram: jest.fn(),
    destroy: jest.fn(),
    detach: jest.fn(),
    getDefinitions: jest.fn(),
    getModules: jest.fn(),
    importDefinitions: jest.fn(),
    invoke: jest.fn(),
    open: jest.fn(),
    saveSVG: jest.fn(),
  };
}

const getModeler = jest.fn().mockImplementation(() => ({
  zoom: () => {},
}));
const importXML = jest.fn().mockImplementation(() => Promise.resolve({ warnings: [] }));
const on = jest
  .fn()
  .mockImplementation(<K extends keyof EventMap>(eventName: K, callback: EventMap[K]): void => {
    eventListeners.add(eventName, callback);
  });
const off = jest
  .fn()
  .mockImplementation(<K extends keyof EventMap>(eventName: K, callback: EventMap[K]): void => {
    eventListeners.remove(eventName, callback);
  });
const saveXML = jest.fn().mockImplementation(() => Promise.resolve({ xml }));

const eventListeners = new EventListeners<EventMap>();

type EventMap = {
  ['commandStack.changed']: () => void;
  ['shape.added']: (taskEvent: TaskEvent) => void;
  ['shape.remove']: (taskEvent: TaskEvent) => void;
  ['selection.changed']: (selectionChangedEvent: SelectionChangedEvent) => void;
};

const modelerEventNames: Array<keyof EventMap> = [
  'commandStack.changed',
  'shape.added',
  'shape.remove',
  'selection.changed',
];

describe('useBpmnEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    eventListeners.clear();
  });

  it('Calls saveBpmn with correct data when the "commandStack.changed" event is triggered', async () => {
    const saveBpmn = jest.fn();
    await setup({ bpmnApiContextProps: { saveBpmn } });
    eventListeners.triggerEvent('commandStack.changed');
    await waitFor(expect(saveBpmn).toHaveBeenCalled);
    expect(saveBpmn).toHaveBeenCalledTimes(1);
    expect(saveBpmn).toHaveBeenCalledWith(xml, null);
  });

  it('Calls onProcessTaskAdd with correct data when the "shape.added" event is triggered', async () => {
    const onProcessTaskAdd = jest.fn();
    const taskEvent: TaskEvent = { element } as TaskEvent;
    await setup({ bpmnApiContextProps: { onProcessTaskAdd } });

    act(() => eventListeners.triggerEvent('shape.added', taskEvent)); // Need to use act here because this event also triggers the addAction function from useStudioRecommendedNextActionContext, which in turn triggers another state update
    await waitFor(expect(onProcessTaskAdd).toHaveBeenCalled);

    const expectedInput: OnProcessTaskEvent = { taskEvent, taskType };
    expect(onProcessTaskAdd).toHaveBeenCalledTimes(1);
    expect(onProcessTaskAdd).toHaveBeenCalledWith(expectedInput);
  });

  it('Calls onProcessTaskRemove with correct data when the "shape.remove" event is triggered', async () => {
    const onProcessTaskRemove = jest.fn();
    const taskEvent: TaskEvent = { element } as TaskEvent;
    await setup({ bpmnApiContextProps: { onProcessTaskRemove } });

    eventListeners.triggerEvent('shape.remove', taskEvent);
    await waitFor(expect(onProcessTaskRemove).toHaveBeenCalled);

    const expectedInput: OnProcessTaskEvent = { taskEvent, taskType };
    expect(onProcessTaskRemove).toHaveBeenCalledTimes(1);
    expect(onProcessTaskRemove).toHaveBeenCalledWith(expectedInput);
  });

  it('Updates BPMN details with selected object when "selection.changed" event is triggered with new selection', async () => {
    const selectionChangedEvent: SelectionChangedEvent = {
      oldSelection: [],
      newSelection: [element],
    };
    const { result } = await setupWithBpmnContext();
    act(() => eventListeners.triggerEvent('selection.changed', selectionChangedEvent));
    expect(result.current.bpmnContext.bpmnDetails.element).toEqual(element);
  });

  it('Updates BPMN details with null when "selection.changed" event is triggered with no new selected object', async () => {
    const selectionChangedEvent: SelectionChangedEvent = {
      oldSelection: [element],
      newSelection: [],
    };
    const { result } = await setupWithBpmnContext();
    act(() => eventListeners.triggerEvent('selection.changed', selectionChangedEvent));
    expect(result.current.bpmnContext.bpmnDetails).toBe(null);
  });

  it('Calls only the most recent saveBpmn function when the "commandStack.changed" event is triggered', async () => {
    const saveBpmn1 = jest.fn();
    const saveBpmn2 = jest.fn();
    const bpmnApiContextProps: Partial<BpmnApiContextProps> = {
      saveBpmn: saveBpmn1,
    };

    const { rerender } = await setup({ bpmnApiContextProps });
    bpmnApiContextProps.saveBpmn = saveBpmn2;
    rerender();

    eventListeners.triggerEvent('commandStack.changed');
    await waitFor(expect(saveBpmn2).toHaveBeenCalled);
    expect(saveBpmn1).not.toHaveBeenCalled();
    expect(saveBpmn2).toHaveBeenCalledTimes(1);
  });

  it('Does not reload the process when a task id change is saved', async () => {
    const saveBpmn = jest.fn().mockResolvedValue(undefined);
    const getSavedBpmn = jest.fn().mockResolvedValue(savedXml);
    const { result } = await setupWithBpmnContext({
      bpmnApiContextProps: { saveBpmn, getSavedBpmn },
    });
    result.current.metadataFormRef.current = { taskIdChange };

    await act(async () => eventListeners.triggerEvent('commandStack.changed'));

    await waitFor(() => expect(saveBpmn).toHaveBeenCalledWith(xml, { taskIdChange }));
    expect(getSavedBpmn).not.toHaveBeenCalled();
    expect(importXML).toHaveBeenCalledTimes(1);
  });

  it('Reloads the process as it is saved and clears the selection when a task id change is rejected', async () => {
    const saveBpmn = jest.fn().mockRejectedValue(new Error('Bad request'));
    const getSavedBpmn = jest.fn().mockResolvedValue(savedXml);
    const { result } = await setupWithBpmnContext({
      bpmnApiContextProps: { saveBpmn, getSavedBpmn },
    });
    act(() =>
      eventListeners.triggerEvent('selection.changed', {
        oldSelection: [],
        newSelection: [element],
      }),
    );
    result.current.metadataFormRef.current = { taskIdChange };

    await act(async () => eventListeners.triggerEvent('commandStack.changed'));

    await waitFor(() => expect(importXML).toHaveBeenCalledTimes(2));
    expect(importXML).toHaveBeenLastCalledWith(savedXml);
    expect(result.current.bpmnContext.bpmnDetails).toBeNull();
  });

  it('Does not reload the process when a save without a task id change fails', async () => {
    const saveBpmn = jest.fn().mockRejectedValue(new Error('Server error'));
    const getSavedBpmn = jest.fn().mockResolvedValue(savedXml);
    await setup({ bpmnApiContextProps: { saveBpmn, getSavedBpmn } });

    await act(async () => eventListeners.triggerEvent('commandStack.changed'));

    await waitFor(() => expect(saveBpmn).toHaveBeenCalledWith(xml, null));
    expect(getSavedBpmn).not.toHaveBeenCalled();
    expect(importXML).toHaveBeenCalledTimes(1);
  });

  it('Keeps the editor as it is when the saved process cannot be fetched', async () => {
    const saveBpmn = jest.fn().mockRejectedValue(new Error('Bad request'));
    const getSavedBpmn = jest.fn().mockRejectedValue(new Error('Network error'));
    const { result } = await setupWithBpmnContext({
      bpmnApiContextProps: { saveBpmn, getSavedBpmn },
    });
    result.current.metadataFormRef.current = { taskIdChange };

    await act(async () => eventListeners.triggerEvent('commandStack.changed'));

    await waitFor(() => expect(getSavedBpmn).toHaveBeenCalled());
    expect(importXML).toHaveBeenCalledTimes(1);
  });

  it('Does not treat the shapes removed and re-added by the reload as task removals or additions', async () => {
    const saveBpmn = jest.fn().mockRejectedValue(new Error('Bad request'));
    const getSavedBpmn = jest.fn().mockResolvedValue(savedXml);
    const onProcessTaskAdd = jest.fn();
    const onProcessTaskRemove = jest.fn();
    const { result } = await setupWithBpmnContext({
      bpmnApiContextProps: { saveBpmn, getSavedBpmn, onProcessTaskAdd, onProcessTaskRemove },
    });
    result.current.metadataFormRef.current = { taskIdChange };
    importXML.mockImplementationOnce(async () => {
      eventListeners.triggerEvent('shape.remove', { element } as TaskEvent);
      eventListeners.triggerEvent('shape.added', { element } as TaskEvent);
      return { warnings: [] };
    });

    await act(async () => eventListeners.triggerEvent('commandStack.changed'));

    await waitFor(() => expect(importXML).toHaveBeenCalledTimes(2));
    expect(onProcessTaskRemove).not.toHaveBeenCalled();
    expect(onProcessTaskAdd).not.toHaveBeenCalled();
  });

  it('Clears the metadata form before the save completes, so the next edit does not resend it', async () => {
    const saveBpmn = jest.fn().mockRejectedValue(new Error('Bad request'));
    const { result } = await setupWithBpmnContext({ bpmnApiContextProps: { saveBpmn } });
    result.current.metadataFormRef.current = { taskIdChange };

    await act(async () => eventListeners.triggerEvent('commandStack.changed'));

    await waitFor(() => expect(saveBpmn).toHaveBeenCalledWith(xml, { taskIdChange }));
    expect(result.current.metadataFormRef.current).toBeUndefined();
  });

  it('Starts a save only after the previous save has completed', async () => {
    const firstSave = withResolvers<void>();
    const saveBpmn = jest.fn().mockReturnValueOnce(firstSave.promise).mockResolvedValue(undefined);
    await setup({ bpmnApiContextProps: { saveBpmn } });

    await act(async () => {
      eventListeners.triggerEvent('commandStack.changed');
      eventListeners.triggerEvent('commandStack.changed');
    });
    expect(saveBpmn).toHaveBeenCalledTimes(1);

    await act(async () => firstSave.resolve());
    await waitFor(() => expect(saveBpmn).toHaveBeenCalledTimes(2));
  });

  it('Does not save an edit made before a rejected task id change was reloaded', async () => {
    const saveBpmn = jest.fn().mockRejectedValueOnce(new Error('Bad request'));
    const getSavedBpmn = jest.fn().mockResolvedValue(savedXml);
    const { result } = await setupWithBpmnContext({
      bpmnApiContextProps: { saveBpmn, getSavedBpmn },
    });
    result.current.metadataFormRef.current = { taskIdChange };

    await act(async () => {
      eventListeners.triggerEvent('commandStack.changed');
      eventListeners.triggerEvent('commandStack.changed');
    });

    await waitFor(() => expect(importXML).toHaveBeenLastCalledWith(savedXml));
    expect(saveBpmn).toHaveBeenCalledTimes(1);
    expect(saveBpmn).toHaveBeenCalledWith(xml, { taskIdChange });
  });

  it('Does not save an edit made while a layout set rename and its reload run, and saves the edits after them', async () => {
    const rename = withResolvers<void>();
    const mutateLayoutSetId = jest.fn().mockReturnValue(rename.promise);
    const saveBpmn = jest.fn().mockResolvedValue(undefined);
    const getSavedBpmn = jest.fn().mockResolvedValue(savedXml);
    const { result } = await setupWithBpmnContext({
      appVersion: v9AppVersion,
      bpmnApiContextProps: { saveBpmn, getSavedBpmn, mutateLayoutSetId },
    });

    await act(async () => {
      result.current.updateLayoutSetId(layoutSetId, 'NamedTask');
      eventListeners.triggerEvent('commandStack.changed');
    });
    expect(mutateLayoutSetId).toHaveBeenCalledTimes(1);

    await act(async () => rename.resolve());
    await waitFor(() => expect(importXML).toHaveBeenLastCalledWith(savedXml));
    expect(saveBpmn).not.toHaveBeenCalled();

    await act(async () => eventListeners.triggerEvent('commandStack.changed'));
    await waitFor(() => expect(saveBpmn).toHaveBeenCalledTimes(1));
  });

  it('Saves an edit made while a layout set rename runs in an app before v9', async () => {
    const rename = withResolvers<void>();
    const mutateLayoutSetId = jest.fn().mockReturnValue(rename.promise);
    const saveBpmn = jest.fn().mockResolvedValue(undefined);
    const { result } = await setupWithBpmnContext({
      bpmnApiContextProps: { saveBpmn, mutateLayoutSetId },
    });

    await act(async () => {
      result.current.updateLayoutSetId(layoutSetId, 'NamedTask');
      eventListeners.triggerEvent('commandStack.changed');
    });
    expect(saveBpmn).not.toHaveBeenCalled();

    await act(async () => rename.resolve());
    await waitFor(() => expect(saveBpmn).toHaveBeenCalledTimes(1));
  });

  it('Resets the modeler ref when the callback is called with null', async () => {
    const { result } = await setupWithBpmnContext();
    const { modelerRef } = result.current.bpmnContext;
    expect(modelerRef.current).not.toBeNull();
    act(() => result.current.bpmnEditor(null));
    expect(modelerRef.current).toBeNull();
  });
});

type BpmnProviderProps = {
  appVersion: AppVersion;
  bpmnApiContextProps: Partial<BpmnApiContextProps>;
};

async function setup(
  props?: Partial<BpmnProviderProps>,
): Promise<RenderHookResult<UseBpmnEditorResult, void>> {
  const utils = renderUseBpmnEditor(props);
  const { result } = utils;
  const div: HTMLDivElement = document.createElement('div');
  result.current(div);
  await waitForEventListenerRegistration();
  return utils;
}

function renderUseBpmnEditor(
  props: Partial<BpmnProviderProps> = {},
): RenderHookResult<UseBpmnEditorResult, void> {
  const wrapper = ({ children }) => renderWithBpmnProviders(children, props);
  return renderHook(() => useBpmnEditor(), { wrapper });
}

function renderWithBpmnProviders(
  children: React.ReactNode,
  props: Partial<BpmnProviderProps> = {},
): React.ReactElement {
  return (
    <BpmnContextProvider
      {...defaultBpmnContextProps}
      appVersion={props.appVersion ?? defaultBpmnContextProps.appVersion}
    >
      <BpmnConfigPanelFormContextProvider>
        <BpmnApiContextProvider {...defaultBpmnApiContextProps} {...props?.bpmnApiContextProps}>
          <StudioRecommendedNextActionContextProvider>
            {children}
          </StudioRecommendedNextActionContextProvider>
        </BpmnApiContextProvider>
      </BpmnConfigPanelFormContextProvider>
    </BpmnContextProvider>
  );
}

async function setupWithBpmnContext(
  props?: Partial<BpmnProviderProps>,
): Promise<RenderHookResult<UseBpmnEditorAndContextResult, void>> {
  const wrapper = ({ children }) => renderWithBpmnProviders(children, props);
  const utils = renderHook(() => useBpmnEditorAndContext(), { wrapper });
  const { result } = utils;
  const div = document.createElement('div');
  result.current.bpmnEditor(div);
  await waitForEventListenerRegistration();
  return utils;
}

/**
 * The modeler is initialized before the event listeners are registered, so waiting for the
 * registrations is what guarantees that an event triggered right after setup is received.
 * All of them are awaited so that no test depends on the order the listeners are registered in.
 */
async function waitForEventListenerRegistration(): Promise<void> {
  await waitFor(() =>
    modelerEventNames.forEach((eventName) =>
      expect(on).toHaveBeenCalledWith(eventName, expect.any(Function)),
    ),
  );
}

type UseBpmnEditorAndContextResult = {
  bpmnEditor: UseBpmnEditorResult;
  bpmnContext: Partial<BpmnContextProps>;
  metadataFormRef: React.MutableRefObject<MetadataForm>;
  updateLayoutSetId: ReturnType<typeof useUpdateLayoutSetId>;
};

const useBpmnEditorAndContext = (): UseBpmnEditorAndContextResult => {
  const bpmnEditor = useBpmnEditor();
  const bpmnContext = useBpmnContext();
  const { metadataFormRef } = useBpmnConfigPanelFormContext();
  const updateLayoutSetId = useUpdateLayoutSetId();
  return { bpmnEditor, bpmnContext, metadataFormRef, updateLayoutSetId };
};

function withResolvers<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => (resolve = resolvePromise));
  return { promise, resolve };
}
