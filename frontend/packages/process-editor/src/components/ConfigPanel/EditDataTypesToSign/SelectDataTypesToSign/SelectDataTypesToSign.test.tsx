import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { BpmnApiContextProps } from '../../../../contexts/BpmnApiContext';
import { BpmnApiContext } from '../../../../contexts/BpmnApiContext';
import type { BpmnContextProps } from '../../../../contexts/BpmnContext';
import { BpmnContext } from '../../../../contexts/BpmnContext';
import type { SelectDataTypesToSignProps } from './SelectDataTypesToSign';
import { SelectDataTypesToSign } from './SelectDataTypesToSign';
import { BpmnConfigPanelFormContextProvider } from '../../../../contexts/BpmnConfigPanelContext';
import {
  mockBpmnApiContextValue,
  mockBpmnContextValue,
} from '../../../../../test/mocks/bpmnContextMock';
import { createMock, updateModdlePropertiesMock } from '../../../../../test/mocks/bpmnModelerMock';
import { AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS } from 'app-shared/constants';
import {
  getMockBpmnElementForTask,
  mockBpmnDetails,
} from '../../../../../test/mocks/bpmnDetailsMock';

jest.useFakeTimers({ advanceTimers: true });
createMock.mockImplementation((_, data) => data.dataType);

const defaultSelectDataTypeProps: SelectDataTypesToSignProps = {
  onClose: jest.fn(),
};

const availableDataTypeIds = ['dataType1', 'dataType2', 'dataType3'];
const existingDataTypeIds = ['dataType1'];

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
  afterEach(jest.clearAllMocks);

  it('saves the new selection', async () => {
    const user = userEvent.setup();

    renderSelectDataTypesToSign(existingDataTypesProps);

    const combobox = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_set_data_types_to_sign'),
    });
    await user.click(combobox);

    jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS);
    await user.click(screen.getByRole('option', { name: availableDataTypeIds[0] }));

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(updateModdlePropertiesMock).toHaveBeenCalledTimes(1);
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
});

type RenderProps = {
  bpmnApiContextProps: Partial<BpmnApiContextProps>;
  bpmnContextProps: Partial<BpmnContextProps>;
};

const renderSelectDataTypesToSign = (props: Partial<RenderProps> = {}) => {
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
          <SelectDataTypesToSign {...defaultSelectDataTypeProps} />
        </BpmnConfigPanelFormContextProvider>
      </BpmnContext.Provider>
    </BpmnApiContext.Provider>,
  );
};
