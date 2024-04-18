import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useBpmnEditor } from './useBpmnEditor';
import { BpmnContextProvider, useBpmnContext } from '../contexts/BpmnContext';
import { BpmnApiContextProvider } from '../contexts/BpmnApiContext';
import { useBpmnModeler } from './useBpmnModeler';
import { getBpmnEditorDetailsFromBusinessObject } from '../utils/hookUtils';
import type { BpmnDetails } from '../types/BpmnDetails';
import { BpmnTypeEnum } from '../enum/BpmnTypeEnum';
import type { BpmnTaskType } from '../types/BpmnTaskType';

const bpmnDetailsMock: BpmnDetails = {
  id: 'testId',
  name: 'mockName',
  type: BpmnTypeEnum.Task,
  taskType: 'data',
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
    name: 'mockName',
    type: 'bpmn:Task',
    taskType: 'data',
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

const saveBpmnMock = jest.fn();
const addLayoutSetMock = jest.fn();
const deleteLayoutSetMock = jest.fn();

describe('useBpmnEditor', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call saveBpmn when "commandStack.changed" event is triggered on modelerInstance', async () => {
    const currentEventName = 'commandStack.changed';
    renderUseBpmnEditor(false, currentEventName);

    await waitFor(() => expect(saveBpmnMock).toHaveBeenCalledTimes(1));
  });

  it('should call saveBpmn when "commandStack.elements.create.postExecuted" event is triggered on modelerInstance and taskType is data', () => {
    const currentEventName = 'commandStack.elements.create.postExecuted';
    renderUseBpmnEditor(true, currentEventName);

    expect(addLayoutSetMock).toHaveBeenCalledTimes(1);
    expect(addLayoutSetMock).toHaveBeenCalledWith({
      layoutSetIdToUpdate: bpmnDetailsMock.id,
      layoutSetConfig: { id: bpmnDetailsMock.id, tasks: [bpmnDetailsMock.id] },
    });
    expect(setBpmnDetailsMock).toHaveBeenCalledTimes(1);
    expect(setBpmnDetailsMock).toHaveBeenCalledWith(bpmnDetailsMock);
  });

  it.each(['confirmation', 'signing', 'feedback', 'endEvent'])(
    'should not call saveBpmn when "commandStack.elements.create.postExecuted" event is triggered on modelerInstance when taskType is not data',
    (taskType: BpmnTaskType) => {
      const mockBpmnDetailsConfirm: BpmnDetails = {
        ...bpmnDetailsMock,
        taskType: taskType,
      };
      (getBpmnEditorDetailsFromBusinessObject as jest.Mock).mockReturnValue(mockBpmnDetailsConfirm);
      const currentEventName = 'commandStack.elements.create.postExecuted';
      renderUseBpmnEditor(true, currentEventName);

      expect(addLayoutSetMock).not.toHaveBeenCalled();
      expect(setBpmnDetailsMock).toHaveBeenCalledTimes(1);
      expect(setBpmnDetailsMock).toHaveBeenCalledWith(mockBpmnDetailsConfirm);
    },
  );

  it('should call deleteLayoutSet when "commandStack.elements.delete.postExecuted" event is triggered on modelerInstance', () => {
    (getBpmnEditorDetailsFromBusinessObject as jest.Mock).mockReturnValue(bpmnDetailsMock);
    const currentEventName = 'commandStack.elements.delete.postExecuted';
    renderUseBpmnEditor(true, currentEventName);

    expect(deleteLayoutSetMock).toHaveBeenCalledTimes(1);
    expect(deleteLayoutSetMock).toHaveBeenCalledWith({ layoutSetIdToUpdate: bpmnDetailsMock.id });
    expect(setBpmnDetailsMock).toHaveBeenCalled();
    expect(setBpmnDetailsMock).toHaveBeenCalledWith(null);
  });

  it('should call setBpmnDetails when "element.click" event is triggered on eventBus', () => {
    (getBpmnEditorDetailsFromBusinessObject as jest.Mock).mockReturnValue(bpmnDetailsMock);
    const currentEventName = 'element.click';
    renderUseBpmnEditor(true, currentEventName);

    expect(setBpmnDetailsMock).toHaveBeenCalledTimes(1);
    expect(setBpmnDetailsMock).toHaveBeenCalledWith({
      ...bpmnDetailsMock,
      element: 'someElement',
    });
  });
});

const renderUseBpmnEditor = (overrideBpmnContext: boolean, currentEventName: string) => {
  overrideBpmnContext && overrideUseBpmnContext();
  overrideUseBpmnModeler(currentEventName);
  renderHook(() => useBpmnEditor(), { wrapper });
};
