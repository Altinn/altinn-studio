import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useBpmnEditor } from './useBpmnEditor';
import { BpmnContextProvider, useBpmnContext } from '../contexts/BpmnContext';
import { BpmnApiContextProvider } from '../contexts/BpmnApiContext';
import { useBpmnModeler } from './useBpmnModeler';
import type { BpmnDetails } from '../types/BpmnDetails';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { getMockBpmnElementForTask, mockBpmnDetails } from '../../test/mocks/bpmnDetailsMock';
import { mockModelerRef } from '../../test/mocks/bpmnModelerMock';
import { getBpmnEditorDetailsFromBusinessObject } from '../utils/bpmnObjectBuilders';

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
  public readonly _currentEvent: any;
  private readonly eventBus: any;

  constructor(currentEventName: string, currentEvent) {
    this._currentEventName = currentEventName;
    this._currentEvent = currentEvent;
    this.eventBus = {
      _currentEventName: this._currentEventName,
      on: this.on,
    };
  }

  on(eventName: string, listener: (event: any) => void) {
    if (eventName === this._currentEventName) {
      listener(this._currentEvent);
    }
  }

  get(elementName: string) {
    if (elementName === 'eventBus') {
      return this.eventBus;
    }
  }
}

jest.mock('../utils/bpmnObjectBuilders', () => ({
  getBpmnEditorDetailsFromBusinessObject: jest.fn().mockReturnValue({}),
}));

jest.mock('../contexts/BpmnConfigPanelContext', () => ({
  useBpmnConfigPanelFormContext: jest.fn(() => ({
    metadataFormRef: { current: null },
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
const onProcessTaskAddMock = jest.fn();
const onProcessTaskRemoveMock = jest.fn();

const overrideUseBpmnContext = () => {
  (useBpmnContext as jest.Mock).mockReturnValue({
    getUpdatedXml: jest.fn(),
    modelerRef: {
      ...mockModelerRef,
    },
    setBpmnDetails: setBpmnDetailsMock,
  });
};

const overrideUseBpmnModeler = (currentEventName: string, currentEvent: any) => {
  (useBpmnModeler as jest.Mock).mockReturnValue({
    getModeler: () => new BpmnModelerMockImpl(currentEventName, currentEvent),
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
      saveBpmn={saveBpmnMock}
      onProcessTaskAdd={onProcessTaskAddMock}
      onProcessTaskRemove={onProcessTaskRemoveMock}
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
    const currentEvent = { element: getMockBpmnElementForTask('data') };
    renderUseBpmnEditor(false, currentEventName, currentEvent);

    await waitFor(() => expect(saveBpmnMock).toHaveBeenCalledTimes(1));
  });

  it('should handle "shape.add" event', async () => {
    const currentEvent = { element: getMockBpmnElementForTask('data') };
    renderUseBpmnEditor(false, 'shape.add', currentEvent);

    await waitFor(() => expect(onProcessTaskAddMock).toHaveBeenCalledTimes(1));
  });

  it('should handle "shape.remove" event', async () => {
    const currentEvent = { element: getMockBpmnElementForTask('data') };
    renderUseBpmnEditor(false, 'shape.remove', currentEvent);

    await waitFor(() => expect(onProcessTaskRemoveMock).toHaveBeenCalledTimes(1));
  });

  it('should call setBpmnDetails with selected object when "selection.changed" event is triggered with new selection', async () => {
    const currentEventName = 'selection.changed';
    const currentEvent = { newSelection: [getMockBpmnElementForTask('data')], oldSelection: [] };
    renderUseBpmnEditor(true, currentEventName, currentEvent);

    await waitFor(() => expect(setBpmnDetailsMock).toHaveBeenCalledTimes(1));
    expect(setBpmnDetailsMock).toHaveBeenCalledWith(mockBpmnDetails);
  });

  it('should call setBpmnDetails with null when "selection.changed" event is triggered with no new selected object', async () => {
    const currentEventName = 'selection.changed';
    const currentEvent = { oldSelection: [getMockBpmnElementForTask('data')], newSelection: [] };
    renderUseBpmnEditor(true, currentEventName, currentEvent);

    await waitFor(() => expect(setBpmnDetailsMock).toHaveBeenCalledTimes(1));
    expect(setBpmnDetailsMock).toHaveBeenCalledWith(null);
  });
});

const renderUseBpmnEditor = (
  overrideBpmnContext: boolean,
  currentEventName: string,
  currentEvent: any,
  bpmnDetails = mockBpmnDetails,
) => {
  overrideBpmnContext && overrideUseBpmnContext();
  overrideGetBpmnEditorDetailsFromBusinessObject(bpmnDetails);
  overrideUseBpmnModeler(currentEventName, currentEvent);
  return renderHook(() => useBpmnEditor(), { wrapper });
};
