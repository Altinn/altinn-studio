import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useBpmnEditor } from './useBpmnEditor';
import { BpmnContextProvider, useBpmnContext } from '../contexts/BpmnContext';
import { BpmnApiContextProvider } from '../contexts/BpmnApiContext';
import { useBpmnModeler } from './useBpmnModeler';

const bpmnDetailsMock = {
  id: 'testId',
  type: 'bpmn:Task',
};

class BpmnModelerMockImpl {
  public readonly _currentEventName: string;
  private readonly eventBus: any;

  constructor(currentEventName: string) {
    this._currentEventName = currentEventName;
    this.eventBus = {
      _currentEventName: this._currentEventName,
      on: this.on,
    };
  }
  on(eventName: string, listener: (event: any) => void) {
    if (eventName === this._currentEventName) {
      listener({ element: 'someElement' });
    }
  }
  get(elementName: string) {
    if (elementName === 'eventBus') {
      return this.eventBus;
    }
  }
}

jest.mock('../utils/hookUtils', () => ({
  getBpmnEditorDetailsFromBusinessObject: jest.fn().mockReturnValue({
    id: 'testId',
    type: 'bpmn:Task',
  }),
}));

jest.mock('../contexts/BpmnConfigPanelContext', () => ({
  useBpmnConfigPanelFormContext: jest.fn(() => ({
    metaDataFormRef: { current: null },
    resetForm: jest.fn(),
  })),
}));

jest.mock('../contexts/BpmnContext', () => ({
  ...jest.requireActual('../contexts/BpmnContext'),
  useBpmnContext: jest.fn(() => ({
    getUpdatedXml: jest.fn(),
    modelerRef: { current: null },
    setBpmnDetails: jest.fn(),
  })),
}));

const setBpmnDetailsMock = jest.fn();
const overrideUseBpmnContext = () => {
  (useBpmnContext as jest.Mock).mockReturnValue({
    getUpdatedXml: jest.fn(),
    modelerRef: { current: null },
    setBpmnDetails: setBpmnDetailsMock,
  });
};

jest.mock('./useBpmnModeler', () => ({
  useBpmnModeler: jest.fn().mockReturnValue({
    getModeler: jest.fn(),
  }),
}));

const overrideUseBpmnModeler = (currentEventName: string) => {
  (useBpmnModeler as jest.Mock).mockReturnValue({
    getModeler: () => new BpmnModelerMockImpl(currentEventName),
  });
};

describe('useBpmnEditor', () => {
  afterEach(jest.clearAllMocks);
  it('should call saveBpmn when "commandStack.changed" event is triggered on modelerInstance', async () => {
    const saveBpmnMock = jest.fn();
    const addLayoutSetMock = jest.fn();
    const deleteLayoutSetMock = jest.fn();
    const currentEventName = 'commandStack.changed';
    const wrapper = ({ children }) => (
      <BpmnContextProvider appLibVersion={'8.0.0'}>
        <BpmnApiContextProvider
          addLayoutSet={addLayoutSetMock}
          deleteLayoutSet={deleteLayoutSetMock}
          saveBpmn={saveBpmnMock}
        >
          {children}
        </BpmnApiContextProvider>
      </BpmnContextProvider>
    );
    overrideUseBpmnModeler(currentEventName);
    renderHook(() => useBpmnEditor(), { wrapper });

    await waitFor(() => expect(saveBpmnMock).toHaveBeenCalledTimes(1));
  });

  it('should call saveBpmn when "shape.add" event is triggered on modelerInstance', () => {
    const saveBpmnMock = jest.fn();
    const addLayoutSetMock = jest.fn();
    const deleteLayoutSetMock = jest.fn();
    const currentEventName = 'shape.add';
    const wrapper = ({ children }) => (
      <BpmnContextProvider appLibVersion={'8.0.0'}>
        <BpmnApiContextProvider
          addLayoutSet={addLayoutSetMock}
          deleteLayoutSet={deleteLayoutSetMock}
          saveBpmn={saveBpmnMock}
        >
          {children}
        </BpmnApiContextProvider>
      </BpmnContextProvider>
    );
    overrideUseBpmnContext();
    overrideUseBpmnModeler(currentEventName);
    renderHook(() => useBpmnEditor(), { wrapper });

    expect(addLayoutSetMock).toHaveBeenCalledTimes(1);
    expect(addLayoutSetMock).toHaveBeenCalledWith({
      layoutSetIdToUpdate: bpmnDetailsMock.id,
      layoutSetConfig: { id: bpmnDetailsMock.id, tasks: [bpmnDetailsMock.id] },
    });
    expect(setBpmnDetailsMock).toHaveBeenCalledTimes(1);
    expect(setBpmnDetailsMock).toHaveBeenCalledWith(bpmnDetailsMock);
  });

  it('should call deleteLayoutSet when "shape.remove" event is triggered on modelerInstance', () => {
    const saveBpmnMock = jest.fn();
    const addLayoutSetMock = jest.fn();
    const deleteLayoutSetMock = jest.fn();
    const currentEventName = 'shape.remove';
    const wrapper = ({ children }) => (
      <BpmnContextProvider appLibVersion={'8.0.0'}>
        <BpmnApiContextProvider
          addLayoutSet={addLayoutSetMock}
          deleteLayoutSet={deleteLayoutSetMock}
          saveBpmn={saveBpmnMock}
        >
          {children}
        </BpmnApiContextProvider>
      </BpmnContextProvider>
    );
    overrideUseBpmnContext();
    overrideUseBpmnModeler(currentEventName);
    renderHook(() => useBpmnEditor(), { wrapper });

    expect(deleteLayoutSetMock).toHaveBeenCalledTimes(1);
    expect(deleteLayoutSetMock).toHaveBeenCalledWith({ layoutSetIdToUpdate: bpmnDetailsMock.id });
    expect(setBpmnDetailsMock).toHaveBeenCalled();
    expect(setBpmnDetailsMock).toHaveBeenCalledWith(null);
  });

  it('should call setBpmnDetails when "element.click" event is triggered on eventBus', () => {
    const saveBpmnMock = jest.fn();
    const addLayoutSetMock = jest.fn();
    const deleteLayoutSetMock = jest.fn();
    const currentEventName = 'element.click';
    const wrapper = ({ children }) => (
      <BpmnContextProvider appLibVersion={'8.0.0'}>
        <BpmnApiContextProvider
          addLayoutSet={addLayoutSetMock}
          deleteLayoutSet={deleteLayoutSetMock}
          saveBpmn={saveBpmnMock}
        >
          {children}
        </BpmnApiContextProvider>
      </BpmnContextProvider>
    );
    overrideUseBpmnContext();
    overrideUseBpmnModeler(currentEventName);
    renderHook(() => useBpmnEditor(), { wrapper });

    expect(setBpmnDetailsMock).toHaveBeenCalledTimes(1);
    expect(setBpmnDetailsMock).toHaveBeenCalledWith({
      id: bpmnDetailsMock.id,
      type: bpmnDetailsMock.type,
      element: 'someElement',
    });
  });
});
