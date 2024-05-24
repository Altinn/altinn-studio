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
  datamodelIds: [],
  connectedTaskId: '',
  existingDataTypeForTask: undefined,
  hideDeleteButton: true,
};

describe('EditDataType', () => {
  afterEach(jest.clearAllMocks);

  it('should display a button to add datamodel when task has no datamodel', () => {
    renderEditDataType({
      bpmnApiContextProps: { layoutSets: layoutSetsWithoutDataTypeConnection },
    });
    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_set_datamodel_link'),
      }),
    ).toBeInTheDocument();
  });

  it('should display a native select with default value when clicking "add datamodel"', async () => {
    const user = userEvent.setup();
    renderEditDataType({
      bpmnApiContextProps: {
        layoutSets: layoutSetsWithoutDataTypeConnection,
      },
    });
    const addDataModelButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_set_datamodel_link'),
    });
    await user.click(addDataModelButton);
    const nativeSelect = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_datamodel'),
    });
    expect(nativeSelect).toHaveValue('noModelKey');
  });

  it('should display all available data types including existing and no-model-key as options for data type select', async () => {
    const user = userEvent.setup();
    const availableDataModelIds = ['dataModel1', 'dataModel2'];
    const existingDataType = mockBpmnApiContextValue.layoutSets.sets[0].dataType;
    renderEditDataType({
      bpmnApiContextProps: { availableDataModelIds },
      componentProps: {
        existingDataTypeForTask: existingDataType,
        datamodelIds: [...availableDataModelIds, existingDataType],
      },
    });
    const updateDataTypeButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_set_datamodel'),
    });
    await user.click(updateDataTypeButton);

    expect(
      screen.getByRole('option', {
        name: textMock('process_editor.configuration_panel_select_datamodel'),
      }),
    ).toBeInTheDocument();
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
        datamodelIds: [existingDataType],
      },
    });

    const updateDataTypeButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_set_datamodel'),
    });
    expect(screen.getByText(existingDataType)).toBeInTheDocument();

    await user.click(updateDataTypeButton);

    const nativeSelect = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_datamodel'),
    });

    expect(nativeSelect).toHaveValue(existingDataType);
  });

  it('should display the existing data type in preview when clicking the close button after edit mode and task has data type', async () => {
    const user = userEvent.setup();
    renderEditDataType({
      componentProps: {
        existingDataTypeForTask: mockBpmnApiContextValue.layoutSets.sets[0].dataType,
      },
    });

    const updateDataTypeButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_set_datamodel'),
    });

    await user.click(updateDataTypeButton);
    const closeButton = screen.getByRole('button', { name: textMock('general.close') });
    await user.click(closeButton);
    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_set_datamodel'),
      }),
    ).toBeInTheDocument();
  });

  it('should display the button to add datamodel when clicking the close button after edit mode and task has no data type', async () => {
    const user = userEvent.setup();
    renderEditDataType({
      bpmnApiContextProps: { layoutSets: layoutSetsWithoutDataTypeConnection },
      componentProps: { existingDataTypeForTask: '' },
    });

    const addDataModelButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_set_datamodel_link'),
    });
    await user.click(addDataModelButton);
    const closeButton = screen.getByRole('button', { name: textMock('general.close') });
    await user.click(closeButton);
    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_set_datamodel_link'),
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
