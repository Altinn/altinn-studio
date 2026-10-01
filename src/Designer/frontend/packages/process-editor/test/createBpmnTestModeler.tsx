import { useState, type ComponentType, type ReactNode } from 'react';
import BpmnModdle from 'bpmn-moddle';
import type Modeler from 'bpmn-js/lib/Modeler';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import EventBus from 'diagram-js/lib/core/EventBus';
import { Injector } from 'didi';
import { StudioRecommendedNextActionContextProvider } from '@studio/components';
import { BpmnContext } from '../src/contexts/BpmnContext';
import { BpmnApiContext, type BpmnApiContextProps } from '../src/contexts/BpmnApiContext';
import { BpmnConfigPanelFormContextProvider } from '../src/contexts/BpmnConfigPanelContext';
import { useBpmnEditor } from '../src/hooks/useBpmnEditor';
import { getBpmnEditorDetailsFromBusinessObject } from '../src/utils/bpmnObjectBuilders';
import type { BpmnBusinessObjectEditor } from '../src/types/BpmnBusinessObjectEditor';
import { altinnCustomTasks } from '../src/extensions/altinnCustomTasks';
import { mockBpmnApiContextValue, mockBpmnContextValue } from './mocks/bpmnContextMock';
import { mockBpmnDetails } from './mocks/bpmnDetailsMock';
import { EventListeners } from './EventListeners';
import { ReadOnlyCommandStack } from '../src/utils/bpmnModeler/ReadOnlyCommandStack';

type TestElement = {
  id: string;
  type: string;
  businessObject: BpmnModdle.BaseElement & BpmnBusinessObjectEditor & ModdleElement;
};

/** Real moddle and command stack; imports are mocked and only the first element is serialized. */
export function createBpmnTestModeler(
  elementType = 'bpmn:ServiceTask',
  properties: Record<string, unknown> = {},
  apiContextProps: Partial<BpmnApiContextProps> = {},
) {
  const moddle = new BpmnModdle({ altinn: altinnCustomTasks });
  const businessObject = moddle.create(elementType, {
    id: 'Task_1',
    ...properties,
  }) as BpmnModdle.BaseElement & BpmnBusinessObjectEditor & ModdleElement;
  const element = {
    ...mockBpmnDetails.element,
    id: businessObject.id,
    type: elementType,
    businessObject,
  };
  const elements: TestElement[] = [element];
  const listeners = new EventListeners<Record<string, (event?: unknown) => void>>();
  const emit = (name: string, event?: unknown) => listeners.triggerEvent(name, event);
  const emitElementsChanged = () => emit('elements.changed', { elements: [element] });
  const emitCommandStackChanged = () => emit('commandStack.changed');
  const commandStackEvents = new EventBus();
  const commandStack = new ReadOnlyCommandStack(commandStackEvents, new Injector([]));
  for (const name of [
    'commandStack.changed',
    'commandStack.updateTaskId.executed',
    'commandStack.updateTaskId.reverted',
  ]) {
    commandStackEvents.on(name, (event: unknown) => emit(name, event));
  }
  const elementRegistry = {
    get: (id: string) => elements.find((candidate) => candidate.id === id),
    getAll: () => elements,
    filter: (predicate: (candidate: TestElement) => boolean) => elements.filter(predicate),
  };
  let selected: TestElement[] = [];
  const selection = {
    get: jest.fn((): TestElement[] => selected),
    select: jest.fn((target?: TestElement) => {
      const oldSelection = selected;
      selected = target ? [target] : [];
      emit('selection.changed', { oldSelection, newSelection: selected });
    }),
  };
  const canvas = { viewbox: jest.fn() };
  const modeling = {
    updateModdleProperties: jest.fn((_element, target: ModdleElement, values: object) => {
      Object.entries(values).forEach(([key, value]) => target.set(key, value));
      emitElementsChanged();
    }),
    updateProperties: jest.fn((_element, values: object) => {
      Object.entries(values).forEach(([key, value]) => businessObject.set(key, value));
      emitElementsChanged();
    }),
  };
  const services = {
    moddle,
    bpmnFactory: moddle,
    modeling,
    commandStack,
    elementRegistry,
    selection,
    canvas,
  };
  const importXML = jest
    .fn<Promise<{ warnings: string[] }>, [xml: string]>()
    .mockResolvedValue({ warnings: [] });
  const modelerRef = {
    current: {
      get: (name: string) => services[name],
      on: (name: string, callback: (event?: unknown) => void) => listeners.add(name, callback),
      off: (name: string, callback: (event?: unknown) => void) => listeners.remove(name, callback),
      importXML,
    } as unknown as Modeler,
  };
  const saveXml = async (): Promise<string> => (await moddle.toXML(businessObject)).xml;

  function DefaultApiProvider({ children }: { children: ReactNode }) {
    return (
      <BpmnApiContext.Provider value={{ ...mockBpmnApiContextValue, ...apiContextProps }}>
        {children}
      </BpmnApiContext.Provider>
    );
  }

  function Wrapper({
    children,
    apiProvider: ApiProvider = DefaultApiProvider,
  }: {
    children: ReactNode;
    apiProvider?: ComponentType<{ children: ReactNode }>;
  }) {
    const [bpmnDetails, setBpmnDetails] = useState(() => ({
      ...getBpmnEditorDetailsFromBusinessObject(businessObject),
      element,
    }));
    return (
      <BpmnConfigPanelFormContextProvider>
        <StudioRecommendedNextActionContextProvider>
          <BpmnContext.Provider
            value={{
              ...mockBpmnContextValue,
              bpmnDetails,
              setBpmnDetails,
              modelerRef,
              getUpdatedXml: saveXml,
            }}
          >
            <ApiProvider>
              <ModelerEvents />
              {children}
            </ApiProvider>
          </BpmnContext.Provider>
        </StudioRecommendedNextActionContextProvider>
      </BpmnConfigPanelFormContextProvider>
    );
  }

  return {
    moddle,
    businessObject,
    element,
    elements,
    modeling,
    commandStack,
    selection,
    canvas,
    importXML,
    modelerRef,
    Wrapper,
    emit,
    emitElementsChanged,
    emitCommandStackChanged,
    saveXml,
  };
}

function ModelerEvents() {
  useBpmnEditor();
  return null;
}
