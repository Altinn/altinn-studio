import React from 'react';
import { render, screen } from '@testing-library/react';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { BpmnApiContextProps } from '../../../../contexts/BpmnApiContext';
import { BpmnApiContext } from '../../../../contexts/BpmnApiContext';
import type { BpmnContextProps } from '../../../../contexts/BpmnContext';
import { BpmnContext } from '../../../../contexts/BpmnContext';
import { toast } from 'react-toastify';
import type { BpmnDetails } from '../../../../types/BpmnDetails';
import { BpmnTypeEnum } from '../../../../enum/BpmnTypeEnum';
import type Modeler from 'bpmn-js/lib/Modeler';
import { EditDataType } from './EditDataType';
import { BpmnConfigPanelFormContextProvider } from '../../../../contexts/BpmnConfigPanelContext';

const mockBPMNXML: string = `<?xml version="1.0" encoding="UTF-8"?></xml>`;

const mockTaskId: string = 'testId';
const mockName: string = 'testName';
const noModelKey: string = 'noModel';
const layoutSetIdToUpdate: string = 'layoutSet1';

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

const mockBpmnApiContextValue: Partial<BpmnApiContextProps> = {
  layoutSets: { sets: [] },
  availableDataModelIds: [],
};

const mockBpmnContextValue: Partial<BpmnContextProps> = {
  bpmnXml: mockBPMNXML,
  bpmnDetails: mockBpmnDetails,
};

describe('EditDataType', () => {
  it('should display the default text as selected in the select list when no data type is connected to task and there are available data types', () => {
    const availableDataTypes = ['dataModel1', 'dataModel2'];
    renderEditDataType(
      { availableDataModelIds: availableDataTypes },
      { modelerRef: modelerRefMock },
    );
    const selectDataModel = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_datamodel'),
    });
    expect(selectDataModel).toBeInTheDocument();
    expect(selectDataModel).toHaveValue(noModelKey);
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
    renderEditDataType(
      {
        availableDataModelIds: availableDataTypes,
        layoutSets: existingLayoutSets,
      },
      { modelerRef: modelerRefMock },
    );
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

  it('should call saveBpmn with new data type when new option is clicked', async () => {
    const user = userEvent.setup();
    const saveBpmnMock = jest.fn();
    const dataTypeToConnect = 'datamodel0';
    const availableDataTypes = [dataTypeToConnect, 'dataModel1', 'dataModel2'];
    const existingLayoutSets: LayoutSets = {
      sets: [
        {
          id: layoutSetIdToUpdate,
          tasks: [mockTaskId],
        },
      ],
    };
    renderEditDataType(
      {
        availableDataModelIds: availableDataTypes,
        layoutSets: existingLayoutSets,
        saveBpmn: saveBpmnMock,
      },
      { modelerRef: modelerRefMock },
    );
    const selectDataModel = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_datamodel'),
    });
    await user.selectOptions(selectDataModel, dataTypeToConnect);
    expect(saveBpmnMock).toHaveBeenCalledWith(mockBPMNXML, {
      dataTypeChange: {
        connectedTaskId: mockTaskId,
        newDataType: dataTypeToConnect,
        oldDataType: undefined,
      },
    });
  });

  it('should call saveBpmn with new data type when data type is changed', async () => {
    const user = userEvent.setup();
    const saveBpmnMock = jest.fn();
    const dataTypeToConnect = 'datamodel1';
    const availableDataTypes = [dataTypeToConnect, 'dataModel2'];
    const connectedDataType = 'dataModel0';
    const existingLayoutSets: LayoutSets = {
      sets: [
        {
          id: layoutSetIdToUpdate,
          tasks: [mockTaskId],
          dataType: connectedDataType,
        },
      ],
    };
    renderEditDataType(
      {
        availableDataModelIds: availableDataTypes,
        layoutSets: existingLayoutSets,
        saveBpmn: saveBpmnMock,
      },
      { modelerRef: modelerRefMock },
    );
    const selectDataModel = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_datamodel'),
    });
    await user.selectOptions(selectDataModel, dataTypeToConnect);
    expect(saveBpmnMock).toHaveBeenCalledWith(mockBPMNXML, {
      dataTypeChange: {
        connectedTaskId: mockTaskId,
        newDataType: dataTypeToConnect,
        oldDataType: connectedDataType,
      },
    });
  });

  it('should call saveBpmn with no data type when data type is set to noModel', async () => {
    const user = userEvent.setup();
    const saveBpmnMock = jest.fn();
    const availableDataTypes = ['datamodel1', 'dataModel2'];
    const connectedDataType = 'dataModel0';
    const existingLayoutSets: LayoutSets = {
      sets: [
        {
          id: layoutSetIdToUpdate,
          tasks: [mockTaskId],
          dataType: connectedDataType,
        },
      ],
    };
    renderEditDataType(
      {
        availableDataModelIds: availableDataTypes,
        layoutSets: existingLayoutSets,
        saveBpmn: saveBpmnMock,
      },
      { modelerRef: modelerRefMock },
    );
    const selectDataModel = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_datamodel'),
    });
    await user.selectOptions(selectDataModel, noModelKey);
    expect(saveBpmnMock).toHaveBeenCalledWith(mockBPMNXML, {
      dataTypeChange: {
        connectedTaskId: mockTaskId,
        newDataType: undefined,
        oldDataType: connectedDataType,
      },
    });
  });

  it('should not call saveBpmn when data type is set to existing', async () => {
    const user = userEvent.setup();
    const saveBpmnMock = jest.fn();
    const availableDataTypes = ['datamodel1', 'dataModel2'];
    const connectedDataType = 'dataModel0';
    const existingLayoutSets: LayoutSets = {
      sets: [
        {
          id: layoutSetIdToUpdate,
          tasks: [mockTaskId],
          dataType: connectedDataType,
        },
      ],
    };
    renderEditDataType(
      {
        availableDataModelIds: availableDataTypes,
        layoutSets: existingLayoutSets,
        saveBpmn: saveBpmnMock,
      },
      { modelerRef: modelerRefMock },
    );
    const selectDataModel = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_datamodel'),
    });
    await user.selectOptions(selectDataModel, connectedDataType);
    expect(saveBpmnMock).not.toHaveBeenCalled();
  });

  it('should show toast error and not call saveBpmn when connected layout set is not found', async () => {
    const user = userEvent.setup();
    jest.spyOn(toast, 'error');
    const saveBpmnMock = jest.fn();
    const dataTypeToConnect = 'dataModel0';
    const availableDataTypes = [dataTypeToConnect, 'datamodel1', 'dataModel2'];
    const existingLayoutSets: LayoutSets = {
      sets: [
        {
          id: 'someOtherLayoutSet',
          tasks: ['someOtherTask'],
        },
      ],
    };
    renderEditDataType(
      {
        availableDataModelIds: availableDataTypes,
        layoutSets: existingLayoutSets,
        saveBpmn: saveBpmnMock,
      },
      { modelerRef: modelerRefMock },
    );
    const selectDataModel = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_datamodel'),
    });
    await user.selectOptions(selectDataModel, dataTypeToConnect);
    expect(toast.error).toHaveBeenCalledWith(textMock('process_editor.layout_set_not_found_error'));
    expect(saveBpmnMock).not.toHaveBeenCalled();
  });
});

const renderEditDataType = (
  bpmnApiContextProps: Partial<BpmnApiContextProps> = {},
  rootContextProps: Partial<BpmnContextProps> = {},
) => {
  return render(
    <BpmnApiContext.Provider value={{ ...mockBpmnApiContextValue, ...bpmnApiContextProps }}>
      <BpmnContext.Provider value={{ ...mockBpmnContextValue, ...rootContextProps }}>
        <BpmnConfigPanelFormContextProvider>
          <EditDataType />
        </BpmnConfigPanelFormContextProvider>
      </BpmnContext.Provider>
    </BpmnApiContext.Provider>,
  );
};
