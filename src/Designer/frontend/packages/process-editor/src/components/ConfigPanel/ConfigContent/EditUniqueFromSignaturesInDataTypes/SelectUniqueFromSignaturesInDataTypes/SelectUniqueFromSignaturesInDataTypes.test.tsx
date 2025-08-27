import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
import { AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS } from 'app-shared/constants';
import {
  getMockBpmnElementForTask,
  mockBpmnDetails,
} from '../../../../../../test/mocks/bpmnDetailsMock';

jest.useFakeTimers({ advanceTimers: true });
createMock.mockImplementation(() => []);

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

jest.mock('../../../../../utils/bpmnModeler/StudioModeler', () => {
  return {
    StudioModeler: jest.fn().mockImplementation(() => {
      return {
        getAllTasksByType: jest.fn().mockReturnValue(signingTasks),
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

    renderSelectDataTypes(existingDataTypesProps);

    const combobox = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_unique_from_signatures_in_data_types'),
    });
    await user.click(combobox);

    jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS);
    await user.click(screen.getByRole('option', { name: signingTasks[0].businessObject.name }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(updateModdlePropertiesMock).toHaveBeenCalled();
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
