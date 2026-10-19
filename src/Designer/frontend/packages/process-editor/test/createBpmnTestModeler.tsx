import { vi } from 'vitest';
import { useState, type ReactNode } from 'react';
import BpmnModdle from 'bpmn-moddle';
import type Modeler from 'bpmn-js/lib/Modeler';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
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

/** Real moddle serialization and editor subscriptions, with in-memory modeling commands. */
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
  const listeners = new EventListeners<Record<string, (event?: unknown) => void>>();
  const emitElementsChanged = () =>
    listeners.triggerEvent('elements.changed', { elements: [element] });
  const emitCommandStackChanged = () => listeners.triggerEvent('commandStack.changed');
  const modeling = {
    updateModdleProperties: vi.fn((_element, target: ModdleElement, values: object) => {
      Object.entries(values).forEach(([key, value]) => target.set(key, value));
      emitElementsChanged();
    }),
    updateProperties: vi.fn((_element, values: object) => {
      Object.entries(values).forEach(([key, value]) => businessObject.set(key, value));
      emitElementsChanged();
    }),
  };
  const services = { moddle, bpmnFactory: moddle, modeling };
  const modelerRef = {
    current: {
      get: (name: string) => services[name],
      on: (name: string, callback: (event?: unknown) => void) => listeners.add(name, callback),
      off: (name: string, callback: (event?: unknown) => void) => listeners.remove(name, callback),
    } as unknown as Modeler,
  };
  const saveXml = async (): Promise<string> => (await moddle.toXML(businessObject)).xml;

  function Wrapper({ children }: { children: ReactNode }) {
    const [bpmnDetails, setBpmnDetails] = useState(() => ({
      ...getBpmnEditorDetailsFromBusinessObject(businessObject),
      element,
    }));
    return (
      <BpmnApiContext.Provider value={{ ...mockBpmnApiContextValue, ...apiContextProps }}>
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
              <ModelerEvents />
              {children}
            </BpmnContext.Provider>
          </StudioRecommendedNextActionContextProvider>
        </BpmnConfigPanelFormContextProvider>
      </BpmnApiContext.Provider>
    );
  }

  return {
    moddle,
    businessObject,
    element,
    modeling,
    modelerRef,
    Wrapper,
    emitElementsChanged,
    emitCommandStackChanged,
    saveXml,
  };
}

function ModelerEvents() {
  useBpmnEditor();
  return null;
}
