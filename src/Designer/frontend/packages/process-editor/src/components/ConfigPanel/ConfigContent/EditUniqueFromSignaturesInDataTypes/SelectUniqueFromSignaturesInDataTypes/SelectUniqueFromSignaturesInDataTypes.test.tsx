import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { BpmnApiContextProps } from '../../../../../contexts/BpmnApiContext';
import { BpmnApiContext } from '../../../../../contexts/BpmnApiContext';
import type { BpmnContextProps } from '../../../../../contexts/BpmnContext';
import { BpmnContext } from '../../../../../contexts/BpmnContext';
import type { SelectUniqueFromSignaturesInDataTypesProps } from './SelectUniqueFromSignaturesInDataTypes';
import { SelectUniqueFromSignaturesInDataTypes } from './SelectUniqueFromSignaturesInDataTypes';
import { BpmnConfigPanelFormContextProvider } from '../../../../../contexts/BpmnConfigPanelContext';
import {
  mockBpmnApiContextValue,
  mockBpmnContextValue,
} from '../../../../../../test/mocks/bpmnContextMock';
import {
  createMock,
  updateModdlePropertiesMock,
} from '../../../../../../test/mocks/bpmnModelerMock';
import {
  getMockBpmnElementForTask,
  mockBpmnDetails,
} from '../../../../../../test/mocks/bpmnDetailsMock';

createMock.mockImplementation((_, properties) => properties);

const existingDataTypes = [
  { id: 'dataType1', name: 'Name 1' },
  { id: 'dataType2', name: 'Name 2' },
];

const defaultSelectDataTypeProps: SelectUniqueFromSignaturesInDataTypesProps = {
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
  {
    id: 'task_3',
    businessObject: {
      name: 'Name 3',
      extensionElements: {
        values: [
          {
            $type: 'altinn:TaskExtension',
            signatureConfig: { signatureDataType: 'dataType3' },
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

const element = getMockBpmnElementForTask('signing');

const existingDataTypesProps = {
  bpmnContextProps: {
    bpmnDetails: {
      ...mockBpmnDetails,
      element,
    },
  },
};

describe('SelectUniqueFromSignaturesInDataTypes', () => {
  afterEach(jest.clearAllMocks);

  it('saves the new selection', async () => {
    const user = userEvent.setup();

    const { unmount } = renderSelectDataTypes(existingDataTypesProps);

    const suggestionInput = screen.getByRole('textbox', {
      name: textMock('process_editor.configuration_panel_set_unique_from_signatures_in_data_types'),
    });
    await user.click(suggestionInput);

    await user.click(
      screen.getByRole('option', { name: signingTasks[0].businessObject.name, hidden: true }),
    );

    unmount();
    expect(updateModdlePropertiesMock).toHaveBeenCalledWith(
      element,
      element.businessObject.extensionElements.values[0].signatureConfig,
      { uniqueFromSignaturesInDataTypes: { dataTypes: [{ dataType: 'dataType1' }] } },
    );
  });

  it('calls onClose when clicking the close button', async () => {
    const user = userEvent.setup();

    element.businessObject.extensionElements.values[0].signatureConfig.uniqueFromSignaturesInDataTypes =
      { dataTypes: existingDataTypes.map((dataType) => ({ dataType: dataType.id })) };

    renderSelectDataTypes(existingDataTypesProps);

    const closeButton = screen.getByRole('button', { name: textMock('general.close') });
    await user.click(closeButton);
    expect(defaultSelectDataTypeProps.onClose).toHaveBeenCalled();
  });
});

type RenderProps = {
  bpmnApiContextProps: Partial<BpmnApiContextProps>;
  bpmnContextProps: Partial<BpmnContextProps>;
};

const renderSelectDataTypes = (props: Partial<RenderProps> = {}) => {
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
          <SelectUniqueFromSignaturesInDataTypes {...defaultSelectDataTypeProps} />
        </BpmnConfigPanelFormContextProvider>
      </BpmnContext.Provider>
    </BpmnApiContext.Provider>,
  );
};
