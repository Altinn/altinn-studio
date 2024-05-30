import React from 'react';
import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { type BpmnApiContextProps, BpmnApiContext } from '../../../contexts/BpmnApiContext';
import type { BpmnContextProps } from '../../../contexts/BpmnContext';
import { BpmnContext } from '../../../contexts/BpmnContext';
import { EditDataTypesToSign } from './EditDataTypesToSign';
import { BpmnConfigPanelFormContextProvider } from '../../../contexts/BpmnConfigPanelContext';
import {
  mockBpmnApiContextValue,
  mockBpmnContextValue,
} from '../../../../test/mocks/bpmnContextMock';
import { getMockBpmnElementForTask, mockBpmnDetails } from '../../../../test/mocks/bpmnDetailsMock';

const availableDataTypeIds = ['dataType1', 'dataType2', 'dataType3'];
const existingDataTypeIds = ['dataType1', 'dataType2'];

const element = getMockBpmnElementForTask('signing');
element.businessObject.extensionElements.values[0].signatureConfig.dataTypesToSign.dataTypes =
  existingDataTypeIds.map((dataTypeId) => ({ dataType: dataTypeId }));

const existingDataTypesProps = {
  bpmnApiContextProps: { availableDataTypeIds },
  bpmnContextProps: {
    bpmnDetails: {
      ...mockBpmnDetails,
      element,
    },
  },
};

describe('EditDataTypesToSign', () => {
  afterEach(jest.clearAllMocks);

  it('should display a button to add data types when task has no data type', () => {
    renderEditDataType();
    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_set_data_types_to_sign_link'),
      }),
    ).toBeInTheDocument();
  });

  it('should display a combobox without value and a description that data types are missing when clicking "add data types" when there are no data types', async () => {
    const user = userEvent.setup();

    renderEditDataType();

    const addDataTypesButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_set_data_types_to_sign_link'),
    });
    await user.click(addDataTypesButton);
    const combobox = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_data_types_to_sign'),
    });
    const description = screen.getByText(
      textMock('process_editor.configuration_panel_data_types_to_sign_selection_description'),
    );
    expect(description).toBeInTheDocument();

    await user.click(combobox);
    expect(combobox).not.toHaveValue();

    const noAvailableDataTypesOption = screen.getByText(
      textMock('process_editor.configuration_panel_no_data_types_to_sign_to_select'),
    );
    expect(noAvailableDataTypesOption).toBeInTheDocument();
  });

  it('should display the existing data type in preview as a button to edit when task has connected data type', async () => {
    const user = userEvent.setup();

    renderEditDataType(existingDataTypesProps);

    const updateDataTypeButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_set_data_types_to_sign'),
    });
    existingDataTypeIds.forEach((existingDataTypeId) => {
      expect(screen.getByText(existingDataTypeId)).toBeInTheDocument();
    });

    await user.click(updateDataTypeButton);
    existingDataTypeIds.forEach((existingDataTypeId) => {
      expect(screen.getByText(existingDataTypeId)).toBeInTheDocument();
    });
  });

  it('should display the existing data type in preview when clicking the close button after edit mode and task has data type', async () => {
    const user = userEvent.setup();

    renderEditDataType(existingDataTypesProps);

    const updateDataTypeButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_set_data_types_to_sign'),
    });

    await user.click(updateDataTypeButton);
    const closeButton = screen.getByRole('button', { name: textMock('general.close') });
    await user.click(closeButton);
    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_set_data_types_to_sign'),
      }),
    ).toBeInTheDocument();
  });

  it('should display description to select data type and show all available data types including existing as options', async () => {
    const user = userEvent.setup();

    renderEditDataType(existingDataTypesProps);

    const updateDataTypeButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_set_data_types_to_sign'),
    });
    await user.click(updateDataTypeButton);
    const description = screen.getByText(
      textMock('process_editor.configuration_panel_data_types_to_sign_selection_description'),
    );
    expect(description).toBeInTheDocument();

    const combobox = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_data_types_to_sign'),
    });
    await user.click(combobox);

    existingDataTypeIds.forEach((existingDataTypeId) => {
      expect(screen.getByRole('option', { name: existingDataTypeId })).toBeInTheDocument();
    });
    availableDataTypeIds.forEach((dataType) =>
      expect(screen.getByRole('option', { name: dataType })).toBeInTheDocument(),
    );
  });

  it('should display the button to add data types when clicking the close button after edit mode and task has no data type', async () => {
    const user = userEvent.setup();
    renderEditDataType();

    const addDataTypesButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_set_data_types_to_sign_link'),
    });
    await user.click(addDataTypesButton);
    const closeButton = screen.getByRole('button', { name: textMock('general.close') });
    await user.click(closeButton);
    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_set_data_types_to_sign_link'),
      }),
    ).toBeInTheDocument();
  });
});

type RenderProps = {
  bpmnApiContextProps: Partial<BpmnApiContextProps>;
  bpmnContextProps: Partial<BpmnContextProps>;
};

const renderEditDataType = (props: Partial<RenderProps> = {}) => {
  const { bpmnApiContextProps, bpmnContextProps } = props;

  return render(
    <BpmnApiContext.Provider value={{ ...mockBpmnApiContextValue, ...bpmnApiContextProps }}>
      <BpmnContext.Provider
        value={{
          ...mockBpmnContextValue,
          ...bpmnContextProps,
        }}
      >
        <BpmnConfigPanelFormContextProvider>
          <EditDataTypesToSign />
        </BpmnConfigPanelFormContextProvider>
      </BpmnContext.Provider>
    </BpmnApiContext.Provider>,
  );
};
