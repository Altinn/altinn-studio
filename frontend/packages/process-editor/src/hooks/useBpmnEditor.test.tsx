import React from 'react';
import type { RenderHookResult } from '@testing-library/react';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { UseBpmnEditorResult } from './useBpmnEditor';
import { useBpmnEditor } from './useBpmnEditor';
import type { BpmnContextProviderProps } from '../contexts/BpmnContext';
import { BpmnContextProvider, useBpmnContext } from '../contexts/BpmnContext';
import type { BpmnApiContextProps } from '../contexts/BpmnApiContext';
import { BpmnApiContextProvider } from '../contexts/BpmnApiContext';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { mockBpmnDetails } from '../../test/mocks/bpmnDetailsMock';
import { StudioRecommendedNextActionContextProvider } from '@studio/components';
import { BpmnConfigPanelFormContextProvider } from '../contexts/BpmnConfigPanelContext';
import type { TaskEvent } from '../types/TaskEvent';
import { EventListeners } from '../../test/EventListeners';
import type {
  BpmnBusinessObjectEditor,
  BpmnExtensionElementsEditor,
} from '@altinn/process-editor/types/BpmnBusinessObjectEditor';
import { BpmnTypeEnum } from '../enum/BpmnTypeEnum';
import type { BpmnTaskType } from '../types/BpmnTaskType';
import type { OnProcessTaskEvent } from '@altinn/process-editor/types/OnProcessTask';
import type { BpmnDetails } from '@altinn/process-editor/types/BpmnDetails';
import type { SelectionChangedEvent } from '@altinn/process-editor/types/SelectionChangeEvent';
import type BpmnModeler from 'bpmn-js/lib/Modeler';

// Test data:
const appLibVersion = '8.0.0';
const defaultBpmnContextProps: Omit<BpmnContextProviderProps, 'children'> = {
  appLibVersion,
  bpmnXml: undefined,
};
const layoutSetId = 'someLayoutSetId';
const layoutSets: LayoutSets = {
  sets: [
    {
      id: layoutSetId,
      tasks: [mockBpmnDetails.id],
    },
  ],
};
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
  openPolicyEditor: jest.fn(),
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
    const { result } = await setupWithBpmnDetails();
    act(() => eventListeners.triggerEvent('selection.changed', selectionChangedEvent));
    expect(result.current.bpmnDetails.element).toEqual(element);
  });

  it('Updates BPMN details with null when "selection.changed" event is triggered with no new selected object', async () => {
    const selectionChangedEvent: SelectionChangedEvent = {
      oldSelection: [element],
      newSelection: [],
    };
    const { result } = await setupWithBpmnDetails();
    act(() => eventListeners.triggerEvent('selection.changed', selectionChangedEvent));
    expect(result.current.bpmnDetails).toBe(null);
  });

  // Todo: Remove skip when this test passes. Fixing this will resolve https://github.com/Altinn/altinn-studio/issues/13035.
  it.skip('Calls only the most recent saveBpmn function when the "commandStack.changed" event is triggered', async () => {
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
  await waitFor(expect(getModeler).toHaveBeenCalled);
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

async function setupWithBpmnDetails(): Promise<
  RenderHookResult<UseBpmnEditorAndDetailsResult, void>
> {
  const wrapper = ({ children }) => renderWithBpmnProviders(children);
  const utils = renderHook(() => useBpmnEditorAndDetails(), { wrapper });
  const { result } = utils;
  const div = document.createElement('div');
  result.current.bpmnEditor(div);
  await waitFor(expect(getModeler).toHaveBeenCalled);
  return utils;
}

type UseBpmnEditorAndDetailsResult = {
  bpmnEditor: UseBpmnEditorResult;
  bpmnDetails: BpmnDetails;
};

const useBpmnEditorAndDetails = (): UseBpmnEditorAndDetailsResult => {
  const bpmnEditor = useBpmnEditor();
  const { bpmnDetails } = useBpmnContext();
  return { bpmnEditor, bpmnDetails };
};
