import React from 'react';
import { render, screen } from '@testing-library/react';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { BpmnApiContextProps } from '../../../../contexts/BpmnApiContext';
import { BpmnApiContext } from '../../../../contexts/BpmnApiContext';
import type { BpmnContextProps } from '../../../../contexts/BpmnContext';
import { BpmnContext } from '../../../../contexts/BpmnContext';
import type { BpmnDetails } from '../../../../types/BpmnDetails';
import { BpmnTypeEnum } from '../../../../enum/BpmnTypeEnum';
import type Modeler from 'bpmn-js/lib/Modeler';
import type { SelectDataTypeProps } from './SelectDataType';
import { SelectDataType } from './SelectDataType';
import { BpmnConfigPanelFormContextProvider } from '../../../../contexts/BpmnConfigPanelContext';

const mockTaskId: string = 'testId';
const mockName: string = 'testName';
const noModelKey: string = 'noModelKey';

const modelerRefMock = {
  current: {
    get: () => {},
  } as unknown as Modeler,
};

const mockBpmnDetails: BpmnDetails = {
  id: mockTaskId,
  name: mockName,
  taskType: 'data',
  type: BpmnTypeEnum.Task,
};

const mockBpmnContextValue: Partial<BpmnContextProps> = {
  bpmnDetails: mockBpmnDetails,
  modelerRef: modelerRefMock,
};

const defaultSelectDataTypeProps: SelectDataTypeProps = {
  connectedTaskId: mockTaskId,
  dataModelIds: [],
  existingDataType: undefined,
  onClose: jest.fn(),
};

jest.mock('app-shared/hooks/useConfirmationDialogOnPageLeave', () => ({
  useConfirmationDialogOnPageLeave: jest.fn(),
}));

describe('SelectDataType', () => {
  it('should display the default text as disabled in the select list when no data type is connected to task and there are available data types', () => {
    renderEditDataType();
    const selectDataModel = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_datamodel'),
    });
    expect(selectDataModel).toBeInTheDocument();
    expect(selectDataModel).toHaveValue(noModelKey);
    expect(
      screen.getByRole('option', {
        name: textMock('process_editor.configuration_panel_select_datamodel'),
      }),
    ).toBeDisabled();
  });

  it('should call updateDataType with new data type when new option is clicked', async () => {
    const user = userEvent.setup();
    const updateDataTypeMock = jest.fn();
    const dataTypeToConnect = 'datamodel0';
    const dataModelIds = [dataTypeToConnect, 'dataModel1', 'dataModel2'];

    renderEditDataType(
      { dataModelIds },
      {
        updateDataType: updateDataTypeMock,
      },
    );
    const selectDataModel = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_datamodel'),
    });
    await user.selectOptions(selectDataModel, dataTypeToConnect);
    expect(updateDataTypeMock).toHaveBeenCalledWith({
      dataTypeChangeDetails: {
        connectedTaskId: mockTaskId,
        newDataType: dataTypeToConnect,
      },
    });
  });

  it('should call updateDataType with new data type when data type is changed', async () => {
    const user = userEvent.setup();
    const updateDataTypeMock = jest.fn();
    const existingDataType = 'dataModel0';
    const dataTypeToConnect = 'datamodel1';
    const dataModelIds = [existingDataType, dataTypeToConnect, 'dataModel2'];
    renderEditDataType(
      { dataModelIds, existingDataType },
      {
        updateDataType: updateDataTypeMock,
      },
    );
    const selectDataModel = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_datamodel'),
    });
    await user.selectOptions(selectDataModel, dataTypeToConnect);
    expect(updateDataTypeMock).toHaveBeenCalledWith({
      dataTypeChangeDetails: {
        connectedTaskId: mockTaskId,
        newDataType: dataTypeToConnect,
      },
    });
  });

  it('should call updateDataType with no data type when data type is deleted', async () => {
    const user = userEvent.setup();
    const updateDataTypeMock = jest.fn();
    const existingDataType = 'dataModel0';
    const dataModelIds = [existingDataType, 'datamodel1', 'dataModel2'];
    renderEditDataType(
      { dataModelIds, existingDataType },
      {
        updateDataType: updateDataTypeMock,
      },
    );
    const deleteDataTypeButton = screen.getByRole('button', {
      name: textMock('general.delete'),
    });
    await user.click(deleteDataTypeButton);
    expect(updateDataTypeMock).toHaveBeenCalledWith({
      dataTypeChangeDetails: {
        connectedTaskId: mockTaskId,
        newDataType: undefined,
      },
    });
  });

  it('should not call updateDataType when data type is set to existing', async () => {
    const user = userEvent.setup();
    const updateDataTypeMock = jest.fn();
    const existingDataType = 'dataModel0';
    const dataModelIds = [existingDataType, 'datamodel1', 'dataModel2'];
    renderEditDataType(
      { dataModelIds, existingDataType },
      {
        updateDataType: updateDataTypeMock,
      },
    );
    const selectDataModel = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_datamodel'),
    });
    await user.selectOptions(selectDataModel, existingDataType);
    expect(updateDataTypeMock).not.toHaveBeenCalled();
  });
});

const renderEditDataType = (
  defaultProps: Partial<SelectDataTypeProps> = {},
  bpmnApiContextProps: Partial<BpmnApiContextProps> = {},
) => {
  return render(
    <BpmnApiContext.Provider value={{ ...bpmnApiContextProps }}>
      <BpmnContext.Provider value={{ ...mockBpmnContextValue }}>
        <BpmnConfigPanelFormContextProvider>
          <SelectDataType {...defaultSelectDataTypeProps} {...defaultProps} />
        </BpmnConfigPanelFormContextProvider>
      </BpmnContext.Provider>
    </BpmnApiContext.Provider>,
  );
};
