import React from 'react';
import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { type BpmnApiContextProps, BpmnApiContext } from '../../../contexts/BpmnApiContext';
import { BpmnContext } from '../../../contexts/BpmnContext';
import { EditDataType, type EditDataTypeProps } from './EditDataType';
import { BpmnConfigPanelFormContextProvider } from '../../../contexts/BpmnConfigPanelContext';
import {
  mockBpmnApiContextValue,
  mockBpmnContextValue,
} from '../../../../test/mocks/bpmnContextMock';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

const mockTaskId: string = 'testId';
const layoutSetsWithoutDataTypeConnection: LayoutSets = {
  sets: [
    {
      id: 'setWithDataType',
      tasks: [mockTaskId],
    },
  ],
};

const defaultProps: EditDataTypeProps = {
  dataModelIds: [],
  connectedTaskId: '',
  existingDataTypeForTask: undefined,
  hideDeleteButton: true,
};

describe('EditDataType', () => {
  afterEach(jest.clearAllMocks);

  it('should display a button to add data model when task has no data model', () => {
    renderEditDataType({
      bpmnApiContextProps: { layoutSets: layoutSetsWithoutDataTypeConnection },
    });
    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_set_data_model_link'),
      }),
    ).toBeInTheDocument();
  });

  it('should display a combobox without value and a description that data models are missing when clicking "add data model" when there are no data models', async () => {
    const user = userEvent.setup();
    renderEditDataType({
      bpmnApiContextProps: {
        layoutSets: layoutSetsWithoutDataTypeConnection,
      },
    });
    const addDataModelButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_set_data_model_link'),
    });
    await user.click(addDataModelButton);
    const combobox = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_data_model'),
    });
    const description = screen.getByText(
      textMock('process_editor.configuration_panel_data_model_selection_description'),
    );
    expect(description).toBeInTheDocument();

    await user.click(combobox);
    expect(combobox).not.toHaveValue();

    const noAvailablemodelsOption = screen.getByText(
      textMock('process_editor.configuration_panel_no_data_model_to_select'),
    );
    expect(noAvailablemodelsOption).toBeInTheDocument();
  });

  it('should display description to select data type and show all available data types including existing as options', async () => {
    const user = userEvent.setup();
    const availableDataModelIds = ['dataModel1', 'dataModel2'];
    const existingDataType = mockBpmnApiContextValue.layoutSets.sets[0].dataType;
    renderEditDataType({
      bpmnApiContextProps: { availableDataModelIds },
      componentProps: {
        existingDataTypeForTask: existingDataType,
        dataModelIds: [...availableDataModelIds, existingDataType],
      },
    });
    const updateDataTypeButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_set_data_model'),
    });
    await user.click(updateDataTypeButton);
    const description = screen.getByText(
      textMock('process_editor.configuration_panel_data_model_selection_description'),
    );
    expect(description).toBeInTheDocument();

    const combobox = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_data_model'),
    });
    await user.click(combobox);

    expect(screen.getByRole('option', { name: existingDataType })).toBeInTheDocument();
    availableDataModelIds.forEach((dataType) =>
      expect(screen.getByRole('option', { name: dataType })).toBeInTheDocument(),
    );
  });

  it('should display the existing data type in preview as a button to edit when task has connected data model', async () => {
    const user = userEvent.setup();
    const existingDataType = mockBpmnApiContextValue.layoutSets.sets[0].dataType;

    renderEditDataType({
      componentProps: {
        existingDataTypeForTask: existingDataType,
        dataModelIds: [existingDataType],
      },
    });

    const updateDataTypeButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_set_data_model'),
    });
    expect(screen.getByText(existingDataType)).toBeInTheDocument();

    await user.click(updateDataTypeButton);
    const combobox = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_data_model'),
    });
    expect(combobox).toHaveValue(existingDataType);
  });

  it('should display the existing data type in preview when clicking the close button after edit mode and task has data type', async () => {
    const user = userEvent.setup();
    renderEditDataType({
      componentProps: {
        existingDataTypeForTask: mockBpmnApiContextValue.layoutSets.sets[0].dataType,
      },
    });

    const updateDataTypeButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_set_data_model'),
    });

    await user.click(updateDataTypeButton);
    const closeButton = screen.getByRole('button', { name: textMock('general.close') });
    await user.click(closeButton);
    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_set_data_model'),
      }),
    ).toBeInTheDocument();
  });

  it('should display the button to add data model when clicking the close button after edit mode and task has no data type', async () => {
    const user = userEvent.setup();
    renderEditDataType({
      bpmnApiContextProps: { layoutSets: layoutSetsWithoutDataTypeConnection },
      componentProps: { existingDataTypeForTask: '' },
    });

    const addDataModelButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_set_data_model_link'),
    });
    await user.click(addDataModelButton);
    const closeButton = screen.getByRole('button', { name: textMock('general.close') });
    await user.click(closeButton);
    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_set_data_model_link'),
      }),
    ).toBeInTheDocument();
  });
});

type RenderProps = {
  bpmnApiContextProps: Partial<BpmnApiContextProps>;
  componentProps: Partial<EditDataTypeProps>;
};

const renderEditDataType = (props: Partial<RenderProps> = {}) => {
  const { bpmnApiContextProps, componentProps } = props;

  return render(
    <BpmnApiContext.Provider value={{ ...mockBpmnApiContextValue, ...bpmnApiContextProps }}>
      <BpmnContext.Provider value={mockBpmnContextValue}>
        <BpmnConfigPanelFormContextProvider>
          <EditDataType {...defaultProps} {...componentProps} />
        </BpmnConfigPanelFormContextProvider>
      </BpmnContext.Provider>
    </BpmnApiContext.Provider>,
  );
};
