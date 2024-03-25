import React from 'react';
import { ConfigContent } from './ConfigContent';
import { render as rtlRender, screen } from '@testing-library/react';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import type { BpmnContextProps } from '../../../contexts/BpmnContext';
import { BpmnContext } from '../../../contexts/BpmnContext';
import type { BpmnDetails } from '../../../types/BpmnDetails';
import { BpmnTypeEnum } from '../../../enum/BpmnTypeEnum';
import type { BpmnApiContextProps } from '../../../contexts/BpmnApiContext';
import { BpmnApiContext } from '../../../contexts/BpmnApiContext';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

const mockBPMNXML: string = `<?xml version="1.0" encoding="UTF-8"?></xml>`;
const mockAppLibVersion8: string = '8.0.3';

const mockTaskId: string = 'testId';
const mockName: string = 'testName';

const mockBpmnDetails: BpmnDetails = {
  id: mockTaskId,
  name: mockName,
  taskType: 'data',
  type: BpmnTypeEnum.Task,
};

const mockBpmnApiContextValue: Partial<BpmnApiContextProps> = {
  layoutSets: { sets: [] },
  availableDataModelIds: [],
};

const mockBpmnContextValue: BpmnContextProps = {
  bpmnXml: mockBPMNXML,
  appLibVersion: mockAppLibVersion8,
  numberOfUnsavedChanges: 0,
  setNumberOfUnsavedChanges: jest.fn(),
  getUpdatedXml: jest.fn(),
  isEditAllowed: true,
  bpmnDetails: mockBpmnDetails,
  setBpmnDetails: jest.fn(),
  dataTasksAdded: [],
  setDataTasksAdded: jest.fn(),
  dataTasksRemoved: [],
  setDataTasksRemoved: jest.fn(),
};

describe('ConfigContent', () => {
  afterEach(jest.clearAllMocks);

  it('should display the details about the selected task when a "data" task is selected', () => {
    render();

    expect(
      screen.getByRole('heading', {
        name: textMock('process_editor.configuration_panel_data_task'),
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', {
        name: textMock('process_editor.configuration_panel_set_datamodel'),
      }),
    ).toBeInTheDocument();

    expect(screen.getByText(mockBpmnDetails.id)).toBeInTheDocument();
    expect(screen.getByText(mockBpmnDetails.name)).toBeInTheDocument();
    expect(
      screen.getByText(textMock('process_editor.configuration_panel_no_datamodel')),
    ).toBeInTheDocument();
  });

  it('should display the details about the selected task when a "confirmation" task is selected', () => {
    render({}, { bpmnDetails: { ...mockBpmnDetails, taskType: 'confirmation' } });

    expect(
      screen.getByRole('heading', {
        name: textMock('process_editor.configuration_panel_confirmation_task'),
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', {
        name: textMock('process_editor.configuration_panel_set_datamodel'),
      }),
    ).toBeInTheDocument();

    expect(screen.getByText(mockBpmnDetails.id)).toBeInTheDocument();
    expect(screen.getByText(mockBpmnDetails.name)).toBeInTheDocument();
    expect(
      screen.getByText(textMock('process_editor.configuration_panel_no_datamodel')),
    ).toBeInTheDocument();
  });

  it('should display the details about the selected task when a "feedback" task is selected', () => {
    render({}, { bpmnDetails: { ...mockBpmnDetails, taskType: 'feedback' } });

    expect(
      screen.getByRole('heading', {
        name: textMock('process_editor.configuration_panel_feedback_task'),
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', {
        name: textMock('process_editor.configuration_panel_set_datamodel'),
      }),
    ).toBeInTheDocument();

    expect(screen.getByText(mockBpmnDetails.id)).toBeInTheDocument();
    expect(screen.getByText(mockBpmnDetails.name)).toBeInTheDocument();
    expect(
      screen.getByText(textMock('process_editor.configuration_panel_no_datamodel')),
    ).toBeInTheDocument();
  });

  it('should display the details about the selected task when a "signing" task is selected', () => {
    render({}, { bpmnDetails: { ...mockBpmnDetails, taskType: 'signing' } });

    expect(
      screen.getByRole('heading', {
        name: textMock('process_editor.configuration_panel_signing_task'),
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', {
        name: textMock('process_editor.configuration_panel_set_datamodel'),
      }),
    ).toBeInTheDocument();

    expect(screen.getByText(mockBpmnDetails.id)).toBeInTheDocument();
    expect(screen.getByText(mockBpmnDetails.name)).toBeInTheDocument();
    expect(
      screen.getByText(textMock('process_editor.configuration_panel_no_datamodel')),
    ).toBeInTheDocument();
  });

  it('should display the details about the selected task when a task not of type "BpmnTaskType" is selected', () => {
    render({}, { bpmnDetails: { ...mockBpmnDetails, taskType: undefined } });

    expect(
      screen.getByRole('heading', {
        name: textMock('process_editor.configuration_panel_missing_task'),
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', {
        name: textMock('process_editor.configuration_panel_set_datamodel'),
      }),
    ).toBeInTheDocument();

    expect(screen.getByText(mockBpmnDetails.id)).toBeInTheDocument();
    expect(screen.getByText(mockBpmnDetails.name)).toBeInTheDocument();
    expect(
      screen.getByText(textMock('process_editor.configuration_panel_no_datamodel')),
    ).toBeInTheDocument();
  });

  it('should display the connected data model as selected in the select list by default when data type is connected to task and no available data types exists', () => {
    const connectedDataType = 'dataModel0';
    const existingLayoutSets: LayoutSets = {
      sets: [
        {
          id: 'layoutSet1',
          tasks: [mockTaskId],
          dataType: connectedDataType,
        },
      ],
    };
    render({ layoutSets: existingLayoutSets });
    const selectDataModel = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_datamodel'),
    });
    expect(selectDataModel).toBeInTheDocument();
    expect(selectDataModel).toHaveValue(connectedDataType);
  });

  it('should display the default text as selected in the select list when no data type is connected to task and there are available data types', () => {
    const availableDataTypes = ['dataModel1', 'dataModel2'];
    render({ availableDataModelIds: availableDataTypes });
    const selectDataModel = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_datamodel'),
    });
    expect(selectDataModel).toBeInTheDocument();
    expect(selectDataModel).toHaveValue('noModel');
    expect(
      screen.getByRole('option', {
        name: textMock('process_editor.configuration_panel_no_datamodel'),
      }),
    ).toBeInTheDocument();
  });

  it('should display all available data types including existing and no-model-option as options for data type select', () => {
    const availableDataTypes = ['dataModel1', 'dataModel2'];
    const connectedDataType = 'dataModel0';
    const existingLayoutSets: LayoutSets = {
      sets: [
        {
          id: 'layoutSet1',
          tasks: [mockTaskId],
          dataType: connectedDataType,
        },
      ],
    };
    render({ availableDataModelIds: availableDataTypes, layoutSets: existingLayoutSets });
    const selectDataModel = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_datamodel'),
    });
    expect(selectDataModel).toBeInTheDocument();
    expect(selectDataModel).toHaveValue(connectedDataType);
    expect(
      screen.getByRole('option', {
        name: textMock('process_editor.configuration_panel_no_datamodel'),
      }),
    ).toBeInTheDocument();

    availableDataTypes.forEach((dataType) =>
      expect(screen.getByRole('option', { name: dataType })).toBeInTheDocument(),
    );
  });
});

const render = (
  bpmnApiContextProps: Partial<BpmnApiContextProps> = {},
  bpmnContextProps: Partial<BpmnContextProps> = {},
) => {
  return rtlRender(
    <BpmnApiContext.Provider value={{ ...mockBpmnApiContextValue, ...bpmnApiContextProps }}>
      <BpmnContext.Provider value={{ ...mockBpmnContextValue, ...bpmnContextProps }}>
        <ConfigContent />
      </BpmnContext.Provider>
    </BpmnApiContext.Provider>,
  );
};
