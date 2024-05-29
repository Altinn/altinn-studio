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
import { AddProcessTaskManager, RemoveProcessTaskManager } from '../utils/ProcessTaskManager';

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

jest.mock('../utils/ProcessTaskManager');

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

jest.mock('./useBpmnModeler', () => ({
  useBpmnModeler: jest.fn().mockReturnValue({}),
}));

const setBpmnDetailsMock = jest.fn();
const overrideUseBpmnContext = () => {
  (useBpmnContext as jest.Mock).mockReturnValue({
    getUpdatedXml: jest.fn(),
    modelerRef: {
      ...mockModelerRef,
    },
    setBpmnDetails: setBpmnDetailsMock,
  });
};

const overrideUseBpmnModeler = (currentEventName: string, currentTaskType: BpmnTaskType) => {
  (useBpmnModeler as jest.Mock).mockReturnValue({
    getModeler: () => new BpmnModelerMockImpl(currentEventName, currentTaskType),
    destroyModeler: jest.fn(),
  });
};

const overrideGetBpmnEditorDetailsFromBusinessObject = (bpmnDetails: BpmnDetails) => {
  (getBpmnEditorDetailsFromBusinessObject as jest.Mock).mockReturnValue(bpmnDetails);
};

const wrapper = ({ children }) => (
  <BpmnContextProvider appLibVersion={'8.0.0'}>
    <BpmnApiContextProvider
      addLayoutSet={jest.fn()}
      deleteLayoutSet={jest.fn()}
      deleteDataTypeFromAppMetadata={jest.fn()}
      addDataTypeToAppMetadata={jest.fn()}
      saveBpmn={saveBpmnMock}
      layoutSets={layoutSetsMock}
    >
      {children}
    </BpmnApiContextProvider>
  </BpmnContextProvider>
);

const saveBpmnMock = jest.fn();

describe('useBpmnEditor', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call saveBpmn when "commandStack.changed" event is triggered on modelerInstance', async () => {
    const currentEventName = 'commandStack.changed';
    renderUseBpmnEditor(false, currentEventName);

    await waitFor(() => expect(saveBpmnMock).toHaveBeenCalledTimes(1));
  });

  it('should handle "shape.add" event', async () => {
    renderUseBpmnEditor(false, 'shape.add');

    const handleTaskAddMock = jest.fn();
    (AddProcessTaskManager as jest.Mock).mockImplementation(() => ({
      handleTaskAdd: () => handleTaskAddMock(),
    }));

    await waitFor(() => expect(handleTaskAddMock).toHaveBeenCalledTimes(1));
  });

  it('should handle "shape.remove" event', async () => {
    renderUseBpmnEditor(false, 'shape.remove');

    const handleTaskRemoveMock = jest.fn();
    (RemoveProcessTaskManager as jest.Mock).mockImplementation(() => ({
      handleTaskRemove: () => handleTaskRemoveMock(),
    }));

    await waitFor(() => expect(handleTaskRemoveMock).toHaveBeenCalledTimes(1));
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
  return renderHook(() => useBpmnEditor(), { wrapper });
};
