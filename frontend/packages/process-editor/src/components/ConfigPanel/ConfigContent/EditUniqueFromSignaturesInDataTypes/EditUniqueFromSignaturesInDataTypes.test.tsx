import React from 'react';
import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { type BpmnApiContextProps, BpmnApiContext } from '../../../../contexts/BpmnApiContext';
import type { BpmnContextProps } from '../../../../contexts/BpmnContext';
import { BpmnContext } from '../../../../contexts/BpmnContext';
import { EditUniqueFromSignaturesInDataTypes } from './EditUniqueFromSignaturesInDataTypes';
import { BpmnConfigPanelFormContextProvider } from '../../../../contexts/BpmnConfigPanelContext';
import {
  mockBpmnApiContextValue,
  mockBpmnContextValue,
} from '../../../../../test/mocks/bpmnContextMock';
import {
  getMockBpmnElementForTask,
  mockBpmnDetails,
} from '../../../../../test/mocks/bpmnDetailsMock';

const existingDataTypes = [
  { id: 'dataType1', name: 'Name 1' },
  { id: 'dataType2', name: 'Name 2' },
];

const getExistingDataTypesProps = () => {
  const element = getMockBpmnElementForTask('signing');
  element.businessObject.extensionElements.values[0].signatureConfig.uniqueFromSignaturesInDataTypes =
    { dataTypes: existingDataTypes.map((dataType) => ({ dataType: dataType.id })) };

  return {
    bpmnContextProps: {
      bpmnDetails: {
        ...mockBpmnDetails,
        element,
      },
    },
  };
};

const signingTasks = [
  {
    id: 'task_1',
    businessObject: {
      name: 'Name 1',
      extensionElements: {
        values: [{ signatureConfig: { signatureDataType: 'dataType1' }, taskType: 'signing' }],
      },
    },
  },
  {
    id: 'task_2',
    businessObject: {
      name: 'Name 2',
      extensionElements: {
        values: [{ signatureConfig: { signatureDataType: 'dataType2' }, taskType: 'signing' }],
      },
    },
  },
  {
    id: 'task_3',
    businessObject: {
      name: 'Name 3',
      extensionElements: {
        values: [{ signatureConfig: { signatureDataType: 'dataType3' }, taskType: 'signing' }],
      },
    },
  },
];

jest.mock('../../../../utils/bpmnModeler/StudioModeler', () => {
  return {
    StudioModeler: jest.fn().mockImplementation(() => {
      return {
        getAllTasksByType: jest.fn().mockReturnValue(signingTasks),
      };
    }),
  };
});

describe('EditUniqueFromSignaturesInDataTypes', () => {
  afterEach(jest.clearAllMocks);

  it('should display a button to add unique signature when task has no data types', async () => {
    const user = userEvent.setup();

    renderEditUniqueFromSignaturesInDataTypes();

    const link = screen.getByRole('button', {
      name: textMock(
        'process_editor.configuration_panel_set_unique_from_signatures_in_data_types_link',
      ),
    });

    await user.click(link);

    const combobox = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_unique_from_signatures_in_data_types'),
    });

    await user.click(combobox);
    expect(combobox).not.toHaveValue();
  });

  it('should display the existing data type in preview when clicking the close button after edit mode', async () => {
    const user = userEvent.setup();

    renderEditUniqueFromSignaturesInDataTypes(getExistingDataTypesProps());

    const updateDataTypeButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_set_unique_from_signatures_in_data_types'),
    });

    await user.click(updateDataTypeButton);
    const closeButton = screen.getByRole('button', { name: textMock('general.close') });
    await user.click(closeButton);
    expect(
      screen.getByRole('button', {
        name: textMock(
          'process_editor.configuration_panel_set_unique_from_signatures_in_data_types',
        ),
      }),
    ).toBeInTheDocument();
  });

  it('should display the existing data type in preview as a button to edit and show all available data types including existing as options', async () => {
    const user = userEvent.setup();

    renderEditUniqueFromSignaturesInDataTypes(getExistingDataTypesProps());

    const updateDataTypeButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_set_unique_from_signatures_in_data_types'),
    });
    await user.click(updateDataTypeButton);

    const combobox = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_unique_from_signatures_in_data_types'),
    });
    await user.click(combobox);

    existingDataTypes.forEach((existingDataType) => {
      expect(screen.getByRole('option', { name: existingDataType.name })).toBeInTheDocument();
    });
    signingTasks.forEach((signingTask) =>
      expect(
        screen.getByRole('option', {
          name: signingTask.businessObject.name,
        }),
      ).toBeInTheDocument(),
    );
  });
});

type RenderProps = {
  bpmnApiContextProps: Partial<BpmnApiContextProps>;
  bpmnContextProps: Partial<BpmnContextProps>;
};

const renderEditUniqueFromSignaturesInDataTypes = (props: Partial<RenderProps> = {}) => {
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
          <EditUniqueFromSignaturesInDataTypes />
        </BpmnConfigPanelFormContextProvider>
      </BpmnContext.Provider>
    </BpmnApiContext.Provider>,
  );
};
