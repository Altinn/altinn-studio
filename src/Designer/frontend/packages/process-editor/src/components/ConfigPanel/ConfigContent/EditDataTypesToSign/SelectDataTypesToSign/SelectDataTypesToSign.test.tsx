import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../../../test/renderWithProviders';
import { textMock } from '../../../../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { BpmnApiContextProps } from '../../../../../contexts/BpmnApiContext';
import type { BpmnContextProps } from '../../../../../contexts/BpmnContext';
import type { SelectDataTypesToSignProps } from './SelectDataTypesToSign';
import { SelectDataTypesToSign } from './SelectDataTypesToSign';
import {
  createMock,
  updateModdlePropertiesMock,
} from '../../../../../../test/mocks/bpmnModelerMock';
import {
  getMockBpmnElementForTask,
  mockBpmnDetails,
} from '../../../../../../test/mocks/bpmnDetailsMock';

createMock.mockImplementation((_, data) => data);

const defaultSelectDataTypeProps: SelectDataTypesToSignProps = {
  onClose: jest.fn(),
};

const signingTasks = [
  {
    id: 'task_1',
    businessObject: {
      name: 'Name 1',
      extensionElements: {
        values: [
          {
            $type: 'altinn:TaskExtension',
            signatureConfig: { signatureDataType: 'dataType1' },
            taskType: 'signing',
          },
        ],
      },
    },
  },
  {
    id: 'task_2',
    businessObject: {
      name: 'Name 2',
      extensionElements: {
        values: [
          {
            $type: 'altinn:TaskExtension',
            signatureConfig: { signatureDataType: 'dataType2' },
            taskType: 'signing',
          },
        ],
      },
    },
  },
];

jest.mock('../../../../../utils/bpmnModeler/StudioModeler', () => {
  return {
    StudioModeler: jest.fn().mockImplementation(() => {
      return {
        getElementsByType: jest.fn().mockReturnValue(signingTasks),
      };
    }),
  };
});

const availableDataTypeIds = [
  signingTasks[0].businessObject.extensionElements.values[0].signatureConfig.signatureDataType,
  signingTasks[1].businessObject.extensionElements.values[0].signatureConfig.signatureDataType,
  'dataType3',
  'ref-data-as-pdf',
];
const existingDataTypeIds = ['dataType3'];

const element = getMockBpmnElementForTask('signing');

const existingDataTypesProps = {
  bpmnApiContextProps: { availableDataTypeIds },
  bpmnContextProps: {
    bpmnDetails: {
      ...mockBpmnDetails,
      element,
    },
  },
};

describe('SelectDataTypesToSign', () => {
  beforeEach(() => {
    element.businessObject.extensionElements.values[0].signatureConfig.dataTypesToSign = {
      dataTypes: [],
    };
  });

  afterEach(jest.clearAllMocks);

  it('shows the current BPMN selection after an external change', async () => {
    const { rerender } = renderSelectDataTypesToSign(existingDataTypesProps);
    const signatureConfig = element.businessObject.extensionElements.values[0].signatureConfig;
    signatureConfig.dataTypesToSign = { dataTypes: [{ dataType: 'dataType3' }] };

    rerender(<SelectDataTypesToSign {...defaultSelectDataTypeProps} />);

    expect(
      await screen.findByRole('option', { name: /dataType3/, selected: true }),
    ).toBeInTheDocument();
  });

  it('saves the new selection', async () => {
    const user = userEvent.setup();

    renderSelectDataTypesToSign(existingDataTypesProps);

    const suggestionInput = screen.getByRole('textbox', {
      name: textMock('process_editor.configuration_panel_set_data_types_to_sign'),
    });
    await user.click(suggestionInput);

    await user.click(screen.getByRole('option', { name: availableDataTypeIds[2], hidden: true }));

    expect(updateModdlePropertiesMock).toHaveBeenCalledWith(
      element,
      element.businessObject.extensionElements.values[0].signatureConfig,
      { dataTypesToSign: { dataTypes: [{ dataType: availableDataTypeIds[2] }] } },
    );
  });

  it('calls onClose when clicking the close button', async () => {
    const user = userEvent.setup();

    element.businessObject.extensionElements.values[0].signatureConfig.dataTypesToSign.dataTypes =
      existingDataTypeIds.map((dataTypeId) => ({ dataType: dataTypeId }));

    renderSelectDataTypesToSign(existingDataTypesProps);

    const closeButton = screen.getByRole('button', { name: textMock('general.close') });
    await user.click(closeButton);
    expect(defaultSelectDataTypeProps.onClose).toHaveBeenCalled();
  });

  it('removes signing data types from available data types to sign', async () => {
    const user = userEvent.setup();

    renderSelectDataTypesToSign(existingDataTypesProps);

    const suggestionInput = screen.getByRole('textbox', {
      name: textMock('process_editor.configuration_panel_set_data_types_to_sign'),
    });
    await user.click(suggestionInput);

    availableDataTypeIds.forEach((id, index) => {
      const option = screen.queryByRole('option', { name: id, hidden: true });
      index < 2 ? expect(option).not.toBeInTheDocument() : expect(option).toBeInTheDocument();
    });
  });
});

type RenderProps = {
  bpmnApiContextProps: Partial<BpmnApiContextProps>;
  bpmnContextProps: Partial<BpmnContextProps>;
};

const renderSelectDataTypesToSign = (props: Partial<RenderProps> = {}) => {
  const { bpmnApiContextProps, bpmnContextProps } = props;

  return renderWithProviders(<SelectDataTypesToSign {...defaultSelectDataTypeProps} />, {
    bpmnApiContextProps,
    bpmnContextProps,
  });
};
