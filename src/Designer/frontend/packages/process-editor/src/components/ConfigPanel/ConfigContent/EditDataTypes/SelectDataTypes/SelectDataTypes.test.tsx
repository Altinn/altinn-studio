import React from 'react';
import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { BpmnApiContextProps } from '../../../../../contexts/BpmnApiContext';
import { BpmnApiContext } from '../../../../../contexts/BpmnApiContext';
import { BpmnContext } from '../../../../../contexts/BpmnContext';
import type { SelectDataTypesProps } from './SelectDataTypes';
import { SelectDataTypes } from './SelectDataTypes';
import { BpmnConfigPanelFormContextProvider } from '../../../../../contexts/BpmnConfigPanelContext';
import {
  mockBpmnApiContextValue,
  mockBpmnContextValue,
} from '../../../../../../test/mocks/bpmnContextMock';

const connectedTaskId = mockBpmnApiContextValue.layoutSets.sets[0].tasks[0];
const mockOnClose = jest.fn();

const defaultSelectDataTypeProps: SelectDataTypesProps = {
  connectedTaskId,
  dataModelIds: [],
  existingDataType: undefined,
  onClose: mockOnClose,
};

describe('SelectDataTypes', () => {
  afterEach(jest.clearAllMocks);

  it('should call updateDataTypes with new data type when new option is clicked', async () => {
    const user = userEvent.setup();
    const mutateDataTypesMock = jest.fn();
    const dataTypeToConnect = 'dataModel0';
    const dataModelIds = [dataTypeToConnect, 'dataModel1', 'dataModel2'];

    renderSelectDataTypes(
      { dataModelIds },
      {
        mutateDataTypes: mutateDataTypesMock,
      },
    );
    const combobox = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_data_model_label'),
    });
    await user.click(combobox);
    await user.click(screen.getByRole('option', { name: dataTypeToConnect }));

    expect(mutateDataTypesMock).toHaveBeenCalledWith({
      connectedTaskId,
      newDataTypes: [dataTypeToConnect],
    });
  });

  it('should add existing data type to combobox options', async () => {
    const user = userEvent.setup();
    const existingDataType = 'dataModel0';
    const dataModelIds = ['dataModel1', 'dataModel2'];
    renderSelectDataTypes({ dataModelIds, existingDataType });

    const combobox = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_data_model_label'),
    });

    await user.click(combobox);
    const addedOption = screen.getByRole('option', { name: 'dataModel0' });
    expect(addedOption).toBeInTheDocument();
  });

  it('should call updateDataTypes with new data type when data type is changed', async () => {
    const user = userEvent.setup();
    const mutateDataTypesMock = jest.fn();
    const existingDataType = 'dataModel0';
    const dataTypeToConnect = 'dataModel1';
    const dataModelIds = [existingDataType, dataTypeToConnect, 'dataModel2'];
    renderSelectDataTypes(
      { dataModelIds, existingDataType },
      {
        mutateDataTypes: mutateDataTypesMock,
      },
    );
    const combobox = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_data_model_label'),
    });
    await user.click(combobox);
    await user.click(screen.getByRole('option', { name: dataTypeToConnect }));

    expect(mutateDataTypesMock).toHaveBeenCalledWith({
      connectedTaskId,
      newDataTypes: [dataTypeToConnect],
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call updateDataTypes with no data type when data type is deleted', async () => {
    const user = userEvent.setup();
    const mutateDataTypesMock = jest.fn();
    const existingDataType = 'dataModel0';
    const dataModelIds = [existingDataType, 'dataModel1', 'dataModel2'];
    renderSelectDataTypes(
      { dataModelIds, existingDataType },
      {
        mutateDataTypes: mutateDataTypesMock,
      },
    );
    const deleteDataTypeButton = screen.getByRole('button', {
      name: textMock('general.delete'),
    });
    await user.click(deleteDataTypeButton);
    expect(mutateDataTypesMock).toHaveBeenCalledWith({
      connectedTaskId,
      newDataTypes: [undefined],
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should not call updateDataTypes when data type is set to existing', async () => {
    const user = userEvent.setup();
    const mutateDataTypesMock = jest.fn();
    const existingDataType = 'dataModel0';
    const dataModelIds = [existingDataType, 'dataModel1', 'dataModel2'];
    renderSelectDataTypes(
      { dataModelIds, existingDataType },
      {
        mutateDataTypes: mutateDataTypesMock,
      },
    );
    const combobox = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_data_model_label'),
    });
    await user.click(combobox);
    await user.click(screen.getByRole('option', { name: existingDataType }));

    expect(mutateDataTypesMock).not.toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show selected value in combobox when data type is selected', () => {
    const existingDataType = 'dataModel0';
    const dataModelIds = [existingDataType, 'dataModel1', 'dataModel2'];
    renderSelectDataTypes({
      existingDataType,
      dataModelIds,
    });
    const combobox = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_data_model_label'),
    });
    expect(combobox).toHaveValue(existingDataType);
  });

  it('should show default description text when no data type is selected', () => {
    renderSelectDataTypes();
    const description = screen.getByText(
      textMock('process_editor.configuration_panel_data_model_selection_description'),
    );
    expect(description).toBeInTheDocument();
  });

  it('should show extended description text when data type is already selected', () => {
    const existingDataType = 'dataModel0';
    const dataModelIds = [existingDataType, 'dataModel1', 'dataModel2'];
    renderSelectDataTypes({
      existingDataType: 'dataModel0',
      dataModelIds,
    });
    const description = screen.getByText(
      textMock(
        'process_editor.configuration_panel_data_model_selection_description_existing_model',
      ),
    );
    expect(description).toBeInTheDocument();
  });
});

const renderSelectDataTypes = (
  props: Partial<SelectDataTypesProps> = {},
  bpmnApiContextProps: Partial<BpmnApiContextProps> = {},
) => {
  return render(
    <BpmnApiContext.Provider value={{ ...mockBpmnApiContextValue, ...bpmnApiContextProps }}>
      <BpmnContext.Provider value={{ ...mockBpmnContextValue }}>
        <BpmnConfigPanelFormContextProvider>
          <SelectDataTypes {...defaultSelectDataTypeProps} {...props} />
        </BpmnConfigPanelFormContextProvider>
      </BpmnContext.Provider>
    </BpmnApiContext.Provider>,
  );
};
