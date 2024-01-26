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
const mockedCanvasHTMLDivElement2 = `<div>MockedHtml2</div>` as unknown as HTMLDivElement;

describe('useBpmnModeler', () => {
  it('should create instance of the BpmnModeler when calling getModeler', () => {
    const { result } = renderHook(() => useBpmnModeler());
    const { getModeler } = result.current;

    const modelerInstance = getModeler(mockedCanvasHTMLDivElement) as ModelerMock;
    expect(modelerInstance.container.container).toBe(mockedCanvasHTMLDivElement);
  });

  it('should avoid creating a new instance of the class if it already has an instance', () => {
    const { result } = renderHook(() => useBpmnModeler());
    const { getModeler } = result.current;

    const modelerInstance = getModeler(mockedCanvasHTMLDivElement) as ModelerMock;
    expect(modelerInstance.container.container).toBe(mockedCanvasHTMLDivElement);

    const modelerInstance2 = getModeler(mockedCanvasHTMLDivElement2) as ModelerMock;
    expect(modelerInstance2.container.container).not.toBe(mockedCanvasHTMLDivElement2);
    expect(modelerInstance2.container.container).toBe(mockedCanvasHTMLDivElement);
  });

  it('should kill the instance when unMounting and should be able to create a new instance', () => {
    const { result, unmount } = renderHook(() => useBpmnModeler());
    const { getModeler } = result.current;

    getModeler(mockedCanvasHTMLDivElement) as ModelerMock;

    unmount();

    const modelerInstance2 = getModeler(mockedCanvasHTMLDivElement2) as ModelerMock;
    expect(modelerInstance2.container.container).toBe(mockedCanvasHTMLDivElement2);
  });
});
