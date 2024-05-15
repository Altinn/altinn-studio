import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useBpmnEditor } from './useBpmnEditor';
import { BpmnContextProvider, useBpmnContext } from '../contexts/BpmnContext';
import { BpmnApiContextProvider } from '../contexts/BpmnApiContext';
import { useBpmnModeler } from './useBpmnModeler';
import { getBpmnEditorDetailsFromBusinessObject } from '../utils/hookUtils';
import type { BpmnDetails } from '../types/BpmnDetails';
import type { BpmnTaskType } from '../types/BpmnTaskType';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { getMockBpmnElementForTask, mockBpmnDetails } from '../../test/mocks/bpmnDetailsMock';
import { mockModelerRef } from '../../test/mocks/bpmnModelerMock';

const layoutSetId = 'someLayoutSetId';
const layoutSetsMock: LayoutSets = {
  sets: [
    {
      id: layoutSetId,
      tasks: [mockBpmnDetails.id],
    },
  ],
};

class BpmnModelerMockImpl {
  public readonly _currentEventName: string;
  public readonly _currentTaskType: BpmnTaskType;
  private readonly eventBus: any;

  constructor(currentEventName: string, currentTaskType: BpmnTaskType) {
    this._currentEventName = currentEventName;
    this._currentTaskType = currentTaskType;
    this.eventBus = {
      _currentEventName: this._currentEventName,
      _currentTaskType: this._currentTaskType,
      on: this.on,
    };
  }
  on(eventName: string, listener: (event: any) => void) {
    if (eventName === this._currentEventName) {
      listener({ element: getMockBpmnElementForTask(this._currentTaskType) });
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
    modelerRef: mockModelerRef,
    setBpmnDetails: setBpmnDetailsMock,
  });
};

jest.mock('./useBpmnModeler', () => ({
  useBpmnModeler: jest.fn().mockReturnValue({}),
}));

const overrideUseBpmnModeler = (currentEventName: string, currentTaskType: BpmnTaskType) => {
  (useBpmnModeler as jest.Mock).mockReturnValue({
    getModeler: () => new BpmnModelerMockImpl(currentEventName, currentTaskType),
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
      deleteDataTypeFromAppMetadata={deleteDataTypeFromAppMetadataMock}
      addDataTypeToAppMetadata={addDataTypeToAppMetadataMock}
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
const deleteDataTypeFromAppMetadataMock = jest.fn();
const addDataTypeToAppMetadataMock = jest.fn();

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

  it.each(['confirmation', 'signing', 'payment', 'feedback', 'endEvent'])(
    'should not call addLayoutSet when "shape.add" event is triggered on modelerInstance when taskType is %s',
    (taskType: BpmnTaskType) => {
      const mockBpmnDetailsNotData: BpmnDetails = {
        ...mockBpmnDetails,
        taskType,
        element: getMockBpmnElementForTask(taskType),
      };
      const currentEventName = 'shape.add';
      renderUseBpmnEditor(true, currentEventName, taskType, mockBpmnDetailsNotData);

      expect(addLayoutSetMock).not.toHaveBeenCalled();
      expect(setBpmnDetailsMock).toHaveBeenCalledTimes(1);
      expect(setBpmnDetailsMock).toHaveBeenCalledWith(mockBpmnDetailsNotData);
    },
  );

  it.each(['data', 'confirmation', 'signing', 'payment', 'feedback', 'endEvent'])(
    'should call deleteLayoutSet when "shape.remove" event is triggered on modelerInstance and the task has a connected layout set for taskType %s',
    (taskType: BpmnTaskType) => {
      const mockBpmnDetailsWithConnectedLayoutSet: BpmnDetails = {
        ...mockBpmnDetails,
        taskType,
        element: getMockBpmnElementForTask(taskType),
      };
      const currentEventName = 'shape.remove';
      renderUseBpmnEditor(true, currentEventName, taskType, mockBpmnDetailsWithConnectedLayoutSet);

      expect(deleteLayoutSetMock).toHaveBeenCalledTimes(1);
      expect(deleteLayoutSetMock).toHaveBeenCalledWith({ layoutSetIdToUpdate: layoutSetId });
      expect(setBpmnDetailsMock).toHaveBeenCalled();
      expect(setBpmnDetailsMock).toHaveBeenCalledWith(null);
    },
  );

  it.each(['data', 'confirmation', 'feedback', 'endEvent'])(
    'should not call addDataTypeToApplicationMetadata when "shape.add" event is triggered on modelerInstance and taskType is %s',
    (taskType: BpmnTaskType) => {
      const mockBpmnDetailsNotPayOrSign: BpmnDetails = {
        ...mockBpmnDetails,
        taskType,
        element: getMockBpmnElementForTask(taskType),
      };
      const currentEventName = 'shape.add';
      renderUseBpmnEditor(true, currentEventName, taskType, mockBpmnDetailsNotPayOrSign);

      expect(addDataTypeToAppMetadataMock).not.toHaveBeenCalled();
      expect(setBpmnDetailsMock).toHaveBeenCalled();
    },
  );

  it('should call addDataTypeToApplicationMetadata when "shape.add" event is triggered on modelerInstance and taskType is signing', () => {
    const taskType: BpmnTaskType = 'signing';
    const mockBpmnDetailsSigningTask: BpmnDetails = {
      ...mockBpmnDetails,
      taskType,
      element: getMockBpmnElementForTask(taskType),
    };
    const currentEventName = 'shape.add';
    renderUseBpmnEditor(true, currentEventName, taskType, mockBpmnDetailsSigningTask);

    expect(addDataTypeToAppMetadataMock).toHaveBeenCalledTimes(1);
    expect(addDataTypeToAppMetadataMock).toHaveBeenCalledWith({
      dataTypeId: 'signatureInformation-1234',
    });
    expect(setBpmnDetailsMock).toHaveBeenCalled();
  });

  it('should call addDataTypeToApplicationMetadata when "shape.add" event is triggered on modelerInstance and taskType is payment', () => {
    const taskType: BpmnTaskType = 'payment';
    const mockBpmnDetailsPaymentTask: BpmnDetails = {
      ...mockBpmnDetails,
      taskType,
      element: getMockBpmnElementForTask(taskType),
    };
    const currentEventName = 'shape.add';
    renderUseBpmnEditor(true, currentEventName, taskType, mockBpmnDetailsPaymentTask);

    expect(addDataTypeToAppMetadataMock).toHaveBeenCalledTimes(1);
    expect(addDataTypeToAppMetadataMock).toHaveBeenCalledWith({
      dataTypeId: 'paymentInformation-1234',
    });
    expect(setBpmnDetailsMock).toHaveBeenCalled();
  });

  it.each(['data', 'confirmation', 'feedback', 'endEvent'])(
    'should not call deleteDataTypeFromAppMetadata when "shape.remove" event is triggered on modelerInstance and taskType is %s',
    (taskType: BpmnTaskType) => {
      const mockBpmnDetailsNotPayOrSign: BpmnDetails = {
        ...mockBpmnDetails,
        taskType,
        element: getMockBpmnElementForTask(taskType),
      };
      const currentEventName = 'shape.remove';
      renderUseBpmnEditor(true, currentEventName, taskType, mockBpmnDetailsNotPayOrSign);

      expect(deleteDataTypeFromAppMetadataMock).not.toHaveBeenCalled();
      expect(setBpmnDetailsMock).toHaveBeenCalled();
    },
  );

  it('should call deleteDataTypeFromAppMetadata when "shape.remove" event is triggered on modelerInstance and taskType is signing', () => {
    const taskType: BpmnTaskType = 'signing';
    const mockBpmnDetailsSigningTask: BpmnDetails = {
      ...mockBpmnDetails,
      taskType,
      element: getMockBpmnElementForTask(taskType),
    };
    const currentEventName = 'shape.remove';
    renderUseBpmnEditor(true, currentEventName, taskType, mockBpmnDetailsSigningTask);

    expect(deleteDataTypeFromAppMetadataMock).toHaveBeenCalledTimes(1);
    expect(deleteDataTypeFromAppMetadataMock).toHaveBeenCalledWith({
      dataTypeId: 'signatureInformation-1234',
    });
    expect(setBpmnDetailsMock).toHaveBeenCalled();
  });

  it('should call deleteDataTypeFromAppMetadataMock when "shape.remove" event is triggered on modelerInstance and taskType is payment', () => {
    const taskType: BpmnTaskType = 'payment';
    const mockBpmnDetailsPaymentTask: BpmnDetails = {
      ...mockBpmnDetails,
      taskType,
      element: getMockBpmnElementForTask(taskType),
    };
    const currentEventName = 'shape.remove';
    renderUseBpmnEditor(true, currentEventName, taskType, mockBpmnDetailsPaymentTask);

    expect(deleteDataTypeFromAppMetadataMock).toHaveBeenCalledTimes(1);
    expect(deleteDataTypeFromAppMetadataMock).toHaveBeenCalledWith({
      dataTypeId: 'paymentInformation-1234',
    });
    expect(setBpmnDetailsMock).toHaveBeenCalled();
  });

  it('should not call deleteLayoutSet when "shape.remove" event is triggered on modelerInstance and deleted task has no layoutSet', () => {
    const mockBpmnDetailsWithoutConnectedLayoutSet: BpmnDetails = {
      ...mockBpmnDetails,
      id: 'TaskIdNotPresetInLayoutSets',
    };
    const currentEventName = 'shape.remove';
    renderUseBpmnEditor(
      true,
      currentEventName,
      mockBpmnDetailsWithoutConnectedLayoutSet.taskType,
      mockBpmnDetailsWithoutConnectedLayoutSet,
    );

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
  currentTaskType: BpmnTaskType = 'data',
  bpmnDetails = mockBpmnDetails,
) => {
  overrideBpmnContext && overrideUseBpmnContext();
  overrideGetBpmnEditorDetailsFromBusinessObject(bpmnDetails);
  overrideUseBpmnModeler(currentEventName, currentTaskType);
  renderHook(() => useBpmnEditor(), { wrapper });
};
