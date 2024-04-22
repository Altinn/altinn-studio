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
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { mockBpmnDetails, mockBpmnElement } from '../../test/mocks/bpmnDetailsMock';

const taskId = 'testId';
const layoutSetId = 'someLayoutSetId';

const layoutSetsMock: LayoutSets = {
  sets: [
    {
      id: layoutSetId,
      tasks: [taskId],
    },
  ],
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
      listener({ element: mockBpmnElement });
    }
  }
  get(elementName: string) {
    if (elementName === 'eventBus') {
      return this.eventBus;
    }
  }
}

jest.mock('../utils/hookUtils', () => ({
  getBpmnEditorDetailsFromBusinessObject: jest.fn().mockReturnValue({}),
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
  useBpmnModeler: jest.fn().mockReturnValue({}),
}));

const overrideUseBpmnModeler = (currentEventName: string) => {
  (useBpmnModeler as jest.Mock).mockReturnValue({
    getModeler: () => new BpmnModelerMockImpl(currentEventName),
  });
};

const overrideGetBpmnEditorDetailsFromBusinessObject = (bpmnDetails: BpmnDetails) => {
  (getBpmnEditorDetailsFromBusinessObject as jest.Mock).mockReturnValue(bpmnDetails);
};

const wrapper = ({ children }) => (
  <BpmnContextProvider appLibVersion={'8.0.0'}>
    <BpmnApiContextProvider
      addLayoutSet={addLayoutSetMock}
      deleteLayoutSet={deleteLayoutSetMock}
      saveBpmn={saveBpmnMock}
      layoutSets={layoutSetsMock}
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

  it('should call saveBpmn when "shape.add" event is triggered on modelerInstance and taskType is data', () => {
    const currentEventName = 'shape.add';
    renderUseBpmnEditor(true, currentEventName);

    expect(addLayoutSetMock).toHaveBeenCalledTimes(1);
    expect(addLayoutSetMock).toHaveBeenCalledWith({
      layoutSetIdToUpdate: mockBpmnDetails.id,
      layoutSetConfig: { id: mockBpmnDetails.id, tasks: [mockBpmnDetails.id] },
    });
    expect(setBpmnDetailsMock).toHaveBeenCalledTimes(1);
    expect(setBpmnDetailsMock).toHaveBeenCalledWith(mockBpmnDetails);
  });

  it.each(['confirmation', 'signing', 'feedback', 'endEvent'])(
    'should not call saveBpmn when "shape.add" event is triggered on modelerInstance when taskType is not data',
    (taskType: BpmnTaskType) => {
      const mockBpmnDetailsNotData: BpmnDetails = {
        id: 'otherTestId',
        name: 'mockName',
        type: BpmnTypeEnum.Task,
        taskType: taskType,
        element: mockBpmnElement,
      };
      const currentEventName = 'shape.add';
      renderUseBpmnEditor(true, currentEventName, mockBpmnDetailsNotData);

      expect(addLayoutSetMock).not.toHaveBeenCalled();
      expect(setBpmnDetailsMock).toHaveBeenCalledTimes(1);
      expect(setBpmnDetailsMock).toHaveBeenCalledWith(mockBpmnDetailsNotData);
    },
  );

  it.each(['data', 'confirmation', 'signing', 'feedback', 'endEvent'])(
    'should call deleteLayoutSet when "shape.remove" event is triggered on modelerInstance and the task has a connected layout set',
    (taskType: BpmnTaskType) => {
      const mockBpmnDetailsWithConnectedLayoutSet: BpmnDetails = {
        id: taskId,
        name: 'mockName',
        type: BpmnTypeEnum.Task,
        taskType: taskType,
      };
      const currentEventName = 'shape.remove';
      renderUseBpmnEditor(true, currentEventName, mockBpmnDetailsWithConnectedLayoutSet);

      expect(deleteLayoutSetMock).toHaveBeenCalledTimes(1);
      expect(deleteLayoutSetMock).toHaveBeenCalledWith({ layoutSetIdToUpdate: layoutSetId });
      expect(setBpmnDetailsMock).toHaveBeenCalled();
      expect(setBpmnDetailsMock).toHaveBeenCalledWith(null);
    },
  );

  it('should not call deleteLayoutSet when "shape.remove" event is triggered on modelerInstance and deleted task has no layoutSet', () => {
    const mockBpmnDetailsWithoutConnectedLayoutSet: BpmnDetails = {
      id: 'TaskIdNotPresetInLayoutSets',
      name: 'mockName',
      type: BpmnTypeEnum.Task,
      taskType: 'data',
    };
    const currentEventName = 'shape.remove';
    renderUseBpmnEditor(true, currentEventName, mockBpmnDetailsWithoutConnectedLayoutSet);

    expect(deleteLayoutSetMock).not.toHaveBeenCalled();
    expect(setBpmnDetailsMock).toHaveBeenCalled();
    expect(setBpmnDetailsMock).toHaveBeenCalledWith(null);
  });

  it('should call setBpmnDetails when "element.click" event is triggered on eventBus', () => {
    const currentEventName = 'element.click';
    renderUseBpmnEditor(true, currentEventName);

    expect(setBpmnDetailsMock).toHaveBeenCalledTimes(1);
    expect(setBpmnDetailsMock).toHaveBeenCalledWith(mockBpmnDetails);
  });
});

const renderUseBpmnEditor = (
  overrideBpmnContext: boolean,
  currentEventName: string,
  bpmnDetails = mockBpmnDetails,
) => {
  overrideBpmnContext && overrideUseBpmnContext();
  overrideGetBpmnEditorDetailsFromBusinessObject(bpmnDetails);
  overrideUseBpmnModeler(currentEventName);
  renderHook(() => useBpmnEditor(), { wrapper });
};
