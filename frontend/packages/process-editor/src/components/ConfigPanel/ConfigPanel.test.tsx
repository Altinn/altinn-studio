import React from 'react';
import { ConfigPanel } from './ConfigPanel';
import { act, render as rtlRender, screen } from '@testing-library/react';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { BpmnContext, BpmnContextProps } from '../../contexts/BpmnContext';
import { BpmnDetails } from '../../types/BpmnDetails';
import { BpmnTypeEnum } from '../../enum/BpmnTypeEnum';
import { ApplicationMetadata, DataTypeElement } from 'app-shared/types/ApplicationMetadata';
import userEvent from '@testing-library/user-event';

const mockBPMNXML: string = `<?xml version="1.0" encoding="UTF-8"?></xml>`;
const mockAppLibVersion8: string = '8.0.3';
const mockAppLibVersion7: string = '7.0.3';

const mockBpmnId: string = 'testId';
const mockName: string = 'testName';

const mockBpmnDetails: BpmnDetails = {
  id: mockBpmnId,
  name: mockName,
  taskType: 'data',
  type: BpmnTypeEnum.Task,
};

const mockOrg: string = 'org';
const mockAppId: string = 'id';
const mockDataTypeId1: string = 'type1';
const mockDataTypeTaskId1: string = 'oldTask';
const mockDataType1: DataTypeElement = { id: mockDataTypeId1, taskId: mockDataTypeTaskId1 };
const mockDataTypes: DataTypeElement[] = [mockDataType1];
const mockApplicationMetadata: ApplicationMetadata = {
  id: mockAppId,
  org: mockOrg,
  dataTypes: mockDataTypes,
};

const mockUpdateApplicationMetadata = jest.fn();

const mockBpmnContextValue: BpmnContextProps = {
  bpmnXml: mockBPMNXML,
  appLibVersion: mockAppLibVersion8,
  numberOfUnsavedChanges: 0,
  setNumberOfUnsavedChanges: jest.fn(),
  getUpdatedXml: jest.fn(),
  isEditAllowed: true,
  bpmnDetails: mockBpmnDetails,
  setBpmnDetails: jest.fn(),
  applicationMetadata: mockApplicationMetadata,
  updateApplicationMetadata: mockUpdateApplicationMetadata,
};

describe('ConfigPanel', () => {
  afterEach(jest.clearAllMocks);

  it('should render without crashing', () => {
    render({ appLibVersion: mockAppLibVersion7, bpmnDetails: null, isEditAllowed: false });
    expect(
      screen.getByText(textMock('process_editor.configuration_panel_no_task')),
    ).toBeInTheDocument();
  });

  it('should display the message about selecting a task when bpmnDetails is "null"', () => {
    render({ bpmnDetails: null });
    expect(
      screen.getByText(textMock('process_editor.configuration_panel_no_task')),
    ).toBeInTheDocument();
  });

  it('should display the message about selecting a task when bpmnDetails.type is "Process"', () => {
    render({ bpmnDetails: { ...mockBpmnDetails, type: BpmnTypeEnum.Process } });
    expect(
      screen.getByText(textMock('process_editor.configuration_panel_no_task')),
    ).toBeInTheDocument();
  });

  it('should display the message about selected element not being supported when bpmnDetails.type "SequenceFlow"', () => {
    render({ bpmnDetails: { ...mockBpmnDetails, type: BpmnTypeEnum.SequenceFlow } });
    expect(
      screen.getByText(textMock('process_editor.configuration_panel_element_not_supported')),
    ).toBeInTheDocument();
  });

  it('should display the message about selected element not being supported when bpmnDetails.type "StartEvent"', () => {
    render({ bpmnDetails: { ...mockBpmnDetails, type: BpmnTypeEnum.StartEvent } });
    expect(
      screen.getByText(textMock('process_editor.configuration_panel_element_not_supported')),
    ).toBeInTheDocument();
  });

  it('should display the message about selected element not being supported when bpmnDetails.type "EndEvent"', () => {
    render({ bpmnDetails: { ...mockBpmnDetails, type: BpmnTypeEnum.EndEvent } });
    expect(
      screen.getByText(textMock('process_editor.configuration_panel_element_not_supported')),
    ).toBeInTheDocument();
  });

  it('should display the details about the selected task when a "data" task is selected', async () => {
    render();

    const user = userEvent.setup();
    // Added to remove the error "Warning: An update to Select inside a test was not wrapped in act(...)."
    await act(() => user.tab());

    expect(
      screen.getByRole('heading', {
        name: textMock('process_editor.configuration_panel_data_task'),
        level: 2,
      }),
    ).toBeInTheDocument();

    expect(screen.getByText(mockBpmnDetails.id)).toBeInTheDocument();
    expect(screen.getByText(mockBpmnDetails.name)).toBeInTheDocument();
  });

  it('should display the details about the selected task when a "confirmation" task is selected', async () => {
    render({ bpmnDetails: { ...mockBpmnDetails, taskType: 'confirmation' } });

    const user = userEvent.setup();
    // Added to remove the error "Warning: An update to Select inside a test was not wrapped in act(...)."
    await act(() => user.tab());

    expect(
      screen.getByRole('heading', {
        name: textMock('process_editor.configuration_panel_confirmation_task'),
        level: 2,
      }),
    ).toBeInTheDocument();

    expect(screen.getByText(mockBpmnDetails.id)).toBeInTheDocument();
    expect(screen.getByText(mockBpmnDetails.name)).toBeInTheDocument();
  });

  it('should display the details about the selected task when a "feedback" task is selected', async () => {
    render({ bpmnDetails: { ...mockBpmnDetails, taskType: 'feedback' } });

    const user = userEvent.setup();
    // Added to remove the error "Warning: An update to Select inside a test was not wrapped in act(...)."
    await act(() => user.tab());

    expect(
      screen.getByRole('heading', {
        name: textMock('process_editor.configuration_panel_feedback_task'),
        level: 2,
      }),
    ).toBeInTheDocument();

    expect(screen.getByText(mockBpmnDetails.id)).toBeInTheDocument();
    expect(screen.getByText(mockBpmnDetails.name)).toBeInTheDocument();
  });

  it('should display the details about the selected task when a "signing" task is selected', async () => {
    render({ bpmnDetails: { ...mockBpmnDetails, taskType: 'signing' } });

    const user = userEvent.setup();
    // Added to remove the error "Warning: An update to Select inside a test was not wrapped in act(...)."
    await act(() => user.tab());

    expect(
      screen.getByRole('heading', {
        name: textMock('process_editor.configuration_panel_signing_task'),
        level: 2,
      }),
    ).toBeInTheDocument();

    expect(screen.getByText(mockBpmnDetails.id)).toBeInTheDocument();
    expect(screen.getByText(mockBpmnDetails.name)).toBeInTheDocument();
  });
});

const render = (rootContextProps: Partial<BpmnContextProps> = {}) => {
  return rtlRender(
    <BpmnContext.Provider value={{ ...mockBpmnContextValue, ...rootContextProps }}>
      <ConfigPanel />
    </BpmnContext.Provider>,
  );
};
