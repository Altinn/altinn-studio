import React from 'react';
import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { BpmnApiContextProps } from '../../../../contexts/BpmnApiContext';
import { BpmnApiContext } from '../../../../contexts/BpmnApiContext';
import { BpmnContext } from '../../../../contexts/BpmnContext';
import type { SelectDataTypeProps } from './SelectDataType';
import { SelectDataType } from './SelectDataType';
import { BpmnConfigPanelFormContextProvider } from '../../../../contexts/BpmnConfigPanelContext';
import {
  mockBpmnApiContextValue,
  mockBpmnContextValue,
} from '../../../../../test/mocks/bpmnContextMock';

const connectedTaskId = mockBpmnApiContextValue.layoutSets.sets[0].tasks[0];
const mockOnClose = jest.fn();

const defaultSelectDataTypeProps: SelectDataTypeProps = {
  connectedTaskId,
  datamodelIds: [], 
  existingDataType: undefined,
  onClose: mockOnClose,
};

describe('SelectDataType', () => {
  afterEach(jest.clearAllMocks);

  it('should call updateDataType with new data type when new option is clicked', async () => {
    const user = userEvent.setup();
    const mutateDataTypeMock = jest.fn();
    const dataTypeToConnect = 'datamodel0';
    const datamodelIds = [dataTypeToConnect, 'dataModel1', 'dataModel2'];

    renderEditDataType(
      { datamodelIds },
      {
        mutateDataType: mutateDataTypeMock,
      },
    );
    const combobox = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_datamodel'),
    });
    await user.click(combobox);
    await user.click(screen.getByRole('option', { name: dataTypeToConnect }));
    
    expect(mutateDataTypeMock).toHaveBeenCalledWith({
      connectedTaskId,
      newDataType: dataTypeToConnect,
    });
  });

  it('should call updateDataType with new data type when data type is changed', async () => {
    const user = userEvent.setup();
    const mutateDataTypeMock = jest.fn();
    const existingDataType = 'dataModel0';
    const dataTypeToConnect = 'datamodel1';
    const datamodelIds = [existingDataType, dataTypeToConnect, 'dataModel2'];
    renderEditDataType(
      { datamodelIds, existingDataType },
      {
        mutateDataType: mutateDataTypeMock,
      },
    );
    const combobox = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_datamodel'),
    });
    await user.click(combobox);
    await user.click(screen.getByRole('option', { name: dataTypeToConnect }));

    expect(mutateDataTypeMock).toHaveBeenCalledWith({
      connectedTaskId,
      newDataType: dataTypeToConnect,
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call updateDataType with no data type when data type is deleted', async () => {
    const user = userEvent.setup();
    const mutateDataTypeMock = jest.fn();
    const existingDataType = 'dataModel0';
    const datamodelIds = [existingDataType, 'datamodel1', 'dataModel2'];
    renderEditDataType(
      { datamodelIds, existingDataType },
      {
        mutateDataType: mutateDataTypeMock,
      },
    );
    const deleteDataTypeButton = screen.getByRole('button', {
      name: textMock('general.delete'),
    });
    await user.click(deleteDataTypeButton);
    expect(mutateDataTypeMock).toHaveBeenCalledWith({
      connectedTaskId,
      newDataType: undefined,
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should not call updateDataType when data type is set to existing', async () => {
    const user = userEvent.setup();
    const mutateDataTypeMock = jest.fn();
    const existingDataType = 'dataModel0';
    const datamodelIds = [existingDataType, 'datamodel1', 'dataModel2'];
    renderEditDataType(
      { datamodelIds, existingDataType },
      {
        mutateDataType: mutateDataTypeMock,
      },
    );
    const combobox = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_datamodel'),
    });
    await user.click(combobox);
    await user.click(screen.getByRole('option', { name: existingDataType }));

    expect(mutateDataTypeMock).not.toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });
});

const renderEditDataType = (
  props: Partial<SelectDataTypeProps> = {},
  bpmnApiContextProps: Partial<BpmnApiContextProps> = {},
) => {
  return render(
    <BpmnApiContext.Provider value={{ ...mockBpmnApiContextValue, ...bpmnApiContextProps }}>
      <BpmnContext.Provider value={{ ...mockBpmnContextValue }}>
        <BpmnConfigPanelFormContextProvider>
          <SelectDataType {...defaultSelectDataTypeProps} {...props} />
        </BpmnConfigPanelFormContextProvider>
      </BpmnContext.Provider>
    </BpmnApiContext.Provider>,
  );
};
