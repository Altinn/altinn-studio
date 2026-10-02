import React from 'react';
import type { RenderHookResult } from '@testing-library/react';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { UseBpmnEditorResult } from './useBpmnEditor';
import { useBpmnEditor } from './useBpmnEditor';
import type { BpmnContextProps, BpmnContextProviderProps } from '../contexts/BpmnContext';
import { BpmnContextProvider, useBpmnContext } from '../contexts/BpmnContext';
import type { BpmnApiContextProps } from '../contexts/BpmnApiContext';
import { BpmnApiContextProvider } from '../contexts/BpmnApiContext';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { mockBpmnDetails } from '../../test/mocks/bpmnDetailsMock';
import {
  StudioRecommendedNextActionContextProvider,
  useStudioRecommendedNextActionContext,
} from '@studio/components';
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
import type { SelectionChangedEvent } from '../types/SelectionChangeEvent';
import type BpmnModeler from 'bpmn-js/lib/Modeler';
import type { UpdateTaskIdContext } from '../commandHandlers/UpdateTaskIdCommandHandler';

const defaultBpmnContextProps: Omit<BpmnContextProviderProps, 'children'> = {
  bpmnXml: undefined,
};
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
  saveSubformPdfComponent: jest.fn(),
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

type UpdateTaskIdEvent = { context: UpdateTaskIdContext };

type EventMap = {
  ['commandStack.changed']: () => void;
  ['commandStack.updateTaskId.executed']: (event: UpdateTaskIdEvent) => void;
  ['commandStack.updateTaskId.reverted']: (event: UpdateTaskIdEvent) => void;
  ['shape.added']: (taskEvent: TaskEvent) => void;
  ['shape.remove']: (taskEvent: TaskEvent) => void;
  ['selection.changed']: (selectionChangedEvent: SelectionChangedEvent) => void;
  ['elements.changed']: (event: { elements: TaskEvent['element'][] }) => void;
};

const modelerEventNames: Array<keyof EventMap> = [
  'commandStack.changed',
  'commandStack.updateTaskId.executed',
  'commandStack.updateTaskId.reverted',
  'shape.added',
  'shape.remove',
  'selection.changed',
];

describe('useBpmnEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    eventListeners.clear();
  });

  it('saves the XML snapshot and metadata when the command stack changes', async () => {
    const saveBpmn = jest.fn();
    await setup({ bpmnApiContextProps: { saveBpmn } });
    eventListeners.triggerEvent('commandStack.changed');
    await waitFor(expect(saveBpmn).toHaveBeenCalled);
    expect(saveBpmn).toHaveBeenCalledTimes(1);
    expect(saveBpmn).toHaveBeenCalledWith(expect.any(Promise), null, {
      addsOrRemovesTasks: false,
    });
    await expect(saveBpmn.mock.lastCall[0]).resolves.toBe(xml);
  });

  it('captures rename metadata from executed commands', async () => {
    const saveBpmn = jest.fn();
    await setup({ bpmnApiContextProps: { saveBpmn } });
    const context = renameContext('Task_1', 'NamedTask');

    act(() => {
      eventListeners.triggerEvent('commandStack.updateTaskId.executed', { context });
      eventListeners.triggerEvent('commandStack.changed');
    });

    expect(saveBpmn).toHaveBeenCalledWith(
      expect.any(Promise),
      { taskIdChange: { oldId: 'Task_1', newId: 'NamedTask' } },
      { addsOrRemovesTasks: false },
    );
  });

  it('captures reverse rename metadata from undone commands', async () => {
    const saveBpmn = jest.fn();
    await setup({ bpmnApiContextProps: { saveBpmn } });
    const context = renameContext('Task_1', 'NamedTask');

    act(() => {
      eventListeners.triggerEvent('commandStack.updateTaskId.reverted', { context });
      eventListeners.triggerEvent('commandStack.changed');
    });

    expect(saveBpmn).toHaveBeenCalledWith(
      expect.any(Promise),
      { taskIdChange: { oldId: 'NamedTask', newId: 'Task_1' } },
      { addsOrRemovesTasks: false },
    );
  });

  it('tracks task additions and removals separately for each save', async () => {
    const saveBpmn = jest.fn();
    await setup({ bpmnApiContextProps: { saveBpmn } });
    const startEvent = {
      element: { id: 'StartEvent_1', businessObject: { $type: BpmnTypeEnum.StartEvent } },
    } as TaskEvent;

    act(() => {
      eventListeners.triggerEvent('shape.added', taskEventFor('data'));
      eventListeners.triggerEvent('commandStack.changed');
    });
    act(() => eventListeners.triggerEvent('commandStack.changed'));
    act(() => {
      eventListeners.triggerEvent('shape.remove', { element } as TaskEvent);
      eventListeners.triggerEvent('commandStack.changed');
    });
    act(() => {
      eventListeners.triggerEvent('shape.added', startEvent);
      eventListeners.triggerEvent('commandStack.changed');
    });

    expect(saveBpmn.mock.calls.map(([, , options]) => options)).toEqual([
      { addsOrRemovesTasks: true },
      { addsOrRemovesTasks: false },
      { addsOrRemovesTasks: true },
      { addsOrRemovesTasks: false },
    ]);
  });

  it.each<BpmnTaskType>(['data', 'payment', 'signing'])(
    'suggests naming a new %s task',
    async (newTaskType) => {
      const { result } = await setupWithBpmnContext();
      act(() => eventListeners.triggerEvent('shape.added', taskEventFor(newTaskType)));
      expect(result.current.shouldDisplayAction(element.id)).toBe(true);
    },
  );

  it('does not suggest naming a new task of another type', async () => {
    const { result } = await setupWithBpmnContext();
    act(() => eventListeners.triggerEvent('shape.added', taskEventFor('pdf')));
    expect(result.current.shouldDisplayAction(element.id)).toBe(false);
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

  it('refreshes the selected task after an edit or undo without requiring another selection', async () => {
    const selectedElement = {
      ...element,
      businessObject: {
        ...businessObject,
        extensionElements: { values: [{ $type: 'altinn:TaskExtension', taskType: 'data' }] },
      },
    };
    const { result } = await setupWithBpmnContext();
    act(() =>
      eventListeners.triggerEvent('selection.changed', {
        oldSelection: [],
        newSelection: [selectedElement],
      }),
    );

    for (const updatedTaskType of ['pdf', 'data']) {
      act(() => {
        selectedElement.businessObject.extensionElements.values[0].taskType = updatedTaskType;
        selectedElement.businessObject.name = `${updatedTaskType} task`;
        eventListeners.triggerEvent('elements.changed', { elements: [selectedElement] });
      });
      expect(result.current.bpmnContext.bpmnDetails).toMatchObject({
        taskType: updatedTaskType,
        name: `${updatedTaskType} task`,
      });
    }
  });

  it('saves through the latest callback after rerendering', async () => {
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

  it('ignores shape changes while importing saved BPMN', async () => {
    const saveBpmn = jest.fn();
    const { result } = await setupWithBpmnContext({ bpmnApiContextProps: { saveBpmn } });
    result.current.bpmnContext.isReloadingRef.current = true;
    act(() => {
      eventListeners.triggerEvent('shape.remove', { element } as TaskEvent);
      eventListeners.triggerEvent('shape.added', { element } as TaskEvent);
      eventListeners.triggerEvent('commandStack.changed');
    });
    expect(saveBpmn).not.toHaveBeenCalled();
    expect(result.current.shouldDisplayAction(element.id)).toBe(false);

    result.current.bpmnContext.isReloadingRef.current = false;
    act(() => eventListeners.triggerEvent('commandStack.changed'));
    expect(saveBpmn).toHaveBeenCalledTimes(1);
    expect(saveBpmn).toHaveBeenCalledWith(expect.any(Promise), null, {
      addsOrRemovesTasks: false,
    });
  });

  it('captures save metadata before serialization and preserves metadata for the next edit', async () => {
    const saveBpmn = jest.fn().mockResolvedValue(undefined);
    const { result } = await setupWithBpmnContext({ bpmnApiContextProps: { saveBpmn } });
    result.current.metadataFormRef.current = { taskIdChange };
    let finishSerialization: (result: { xml: string }) => void;
    saveXML.mockReturnValueOnce(
      new Promise((resolve) => {
        finishSerialization = resolve;
      }),
    );

    act(() => eventListeners.triggerEvent('commandStack.changed'));
    expect(result.current.metadataFormRef.current).toBeUndefined();
    const nextMetadata: MetadataForm = {
      subformPdfComponentChange: {
        taskId: 'PdfTask',
        componentId: 'vehicles',
        sourceLayoutSetId: 'Task_1',
      },
    };
    result.current.metadataFormRef.current = nextMetadata;
    await act(async () => finishSerialization({ xml }));

    expect(saveBpmn).toHaveBeenCalledWith(
      expect.any(Promise),
      { taskIdChange },
      { addsOrRemovesTasks: false },
    );
    await expect(saveBpmn.mock.lastCall[0]).resolves.toBe(xml);
    expect(result.current.metadataFormRef.current).toBe(nextMetadata);
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
    <BpmnContextProvider {...defaultBpmnContextProps}>
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

// Initialization finishes before subscriptions, so await every listener before emitting events.
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
  shouldDisplayAction: (actionId: string) => boolean;
};

const useBpmnEditorAndContext = (): UseBpmnEditorAndContextResult => {
  const bpmnEditor = useBpmnEditor();
  const bpmnContext = useBpmnContext();
  const { metadataFormRef } = useBpmnConfigPanelFormContext();
  const { shouldDisplayAction } = useStudioRecommendedNextActionContext();
  return { bpmnEditor, bpmnContext, metadataFormRef, shouldDisplayAction };
};

function renameContext(oldId: string, newId: string): UpdateTaskIdContext {
  return { element: element as unknown as UpdateTaskIdContext['element'], newId, oldId };
}

function taskEventFor(newTaskType: BpmnTaskType): TaskEvent {
  const values = [{ $type: 'altinn:TaskExtension', taskType: newTaskType }];
  return {
    element: { ...element, businessObject: { ...businessObject, extensionElements: { values } } },
  } as TaskEvent;
}
