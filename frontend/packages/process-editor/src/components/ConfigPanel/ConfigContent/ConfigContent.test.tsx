import React from 'react';
import { ConfigContent } from './ConfigContent';
import { render as rtlRender, screen, act } from '@testing-library/react';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { BpmnContext, BpmnContextProps } from '../../../contexts/BpmnContext';
import { BpmnDetails } from '../../../types/BpmnDetails';
import { BpmnTypeEnum } from '../../../enum/BpmnTypeEnum';
import { ApplicationMetadata, DataTypeElement } from 'app-shared/types/ApplicationMetadata';
import userEvent from '@testing-library/user-event';

const mockBPMNXML: string = `<?xml version="1.0" encoding="UTF-8"?></xml>`;
const mockAppLibVersion8: string = '8.0.3';

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

describe('ConfigContent', () => {
  afterEach(jest.clearAllMocks);

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

  it('displays the link to datamodel page when there are no data types in the applicationMetadata', async () => {
    render({ applicationMetadata: { ...mockApplicationMetadata, dataTypes: undefined } });

    const user = userEvent.setup();
    // Added to remove the error "Warning: An update to Select inside a test was not wrapped in act(...)."
    await act(() => user.tab());

    const link = screen.getByRole('link', {
      name: textMock('process_editor.create_new_datamodel_link'),
    });
    expect(link).toBeInTheDocument();

    const select = screen.queryByRole('combobox', {
      name: textMock('process_editor.select_datatype_label'),
    });
    expect(select).not.toBeInTheDocument();
  });

  it('displays the link to datamodel page when there are only "ref-data-as-pdf" in data types in the applicationMetadata', async () => {
    render({
      applicationMetadata: { ...mockApplicationMetadata, dataTypes: [{ id: 'ref-data-as-pdf' }] },
    });

    const user = userEvent.setup();
    // Added to remove the error "Warning: An update to Select inside a test was not wrapped in act(...)."
    await act(() => user.tab());

    const link = screen.getByRole('link', {
      name: textMock('process_editor.create_new_datamodel_link'),
    });
    expect(link).toBeInTheDocument();

    const select = screen.queryByRole('combobox', {
      name: textMock('process_editor.select_datatype_label'),
    });
    expect(select).not.toBeInTheDocument();
  });

  it('displays the select component when there are valid data types present in the applicationMetadata', async () => {
    render();

    const user = userEvent.setup();
    // Added to remove the error "Warning: An update to Select inside a test was not wrapped in act(...)."
    await act(() => user.tab());

    const select = screen.getByRole('combobox', {
      name: textMock('process_editor.select_datatype_label'),
    });
    expect(select).toBeInTheDocument();

    const link = screen.queryByRole('link', {
      name: textMock('process_editor.create_new_datamodel_link'),
    });
    expect(link).not.toBeInTheDocument();
  });

  it('updates the applicationMetadata when selecting a new datatype', async () => {
    const user = userEvent.setup();
    render();

    const [select] = screen.getAllByLabelText(textMock('process_editor.select_datatype_label'));

    await act(() => user.click(select));
    await act(() => user.click(screen.getByRole('option', { name: mockDataTypeId1 })));
    await act(() => user.tab());

    expect(mockUpdateApplicationMetadata).toHaveBeenCalledTimes(1);
  });
});

const render = (rootContextProps: Partial<BpmnContextProps> = {}) => {
  return rtlRender(
    <BpmnContext.Provider value={{ ...mockBpmnContextValue, ...rootContextProps }}>
      <ConfigContent />
    </BpmnContext.Provider>,
  );
};
