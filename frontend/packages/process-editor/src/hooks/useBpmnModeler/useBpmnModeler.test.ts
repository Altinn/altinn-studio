import { renderHook } from '@testing-library/react';
import { useBpmnModeler } from './useBpmnModeler';
import type Modeler from 'bpmn-js/lib/Modeler';

type ModelerMock = Modeler & { container: { container: HTMLDivElement } };

jest.mock(
  'bpmn-js/lib/Modeler',
  () =>
    class BpmnModelerMockImpl {
      public container: HTMLDivElement;

      constructor(_container: HTMLDivElement) {
        this.container = _container;
      }
    },
);

const mockedCanvasHTMLDivElement = `<div>MockedHtml</div>` as unknown as HTMLDivElement;

describe('useBpmnModeler', () => {
  it('should create instance of the BpmnModeler when calling getModeler', () => {
    const { result } = renderHook(() => useBpmnModeler());
    const { getModeler } = result.current;

    const modelerInstance = getModeler(mockedCanvasHTMLDivElement) as ModelerMock;
    expect(modelerInstance.container.container).toBe(mockedCanvasHTMLDivElement);
  });
});
