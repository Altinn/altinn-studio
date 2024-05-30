import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { BpmnApiContext } from '../../../../contexts/BpmnApiContext';
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

const availableDataTypeIds = ['dataType1', 'dataType2', 'dataType3'];

const defaultSelectDataTypeProps: SelectDataTypesToSignProps = {
  onClose: jest.fn(),
};

describe('SelectDataTypesToSign', () => {
  afterEach(jest.clearAllMocks);

  it('saves the new selection', async () => {
    const user = userEvent.setup();

    renderSelectDataTypesToSign();

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
    renderSelectDataTypesToSign();
    const closeButton = screen.getByRole('button', {
      name: textMock('general.close'),
    });
    await user.click(closeButton);
    expect(defaultSelectDataTypeProps.onClose).toHaveBeenCalled();
  });
});

const renderSelectDataTypesToSign = () => {
  return render(
    <BpmnApiContext.Provider value={{ ...mockBpmnApiContextValue, availableDataTypeIds }}>
      <BpmnContext.Provider
        value={{
          ...mockBpmnContextValue,
          bpmnDetails: {
            ...mockBpmnDetails,
            element: getMockBpmnElementForTask('signing'),
          },
        }}
      >
        <BpmnConfigPanelFormContextProvider>
          <SelectDataTypesToSign {...defaultSelectDataTypeProps} />
        </BpmnConfigPanelFormContextProvider>
      </BpmnContext.Provider>
    </BpmnApiContext.Provider>,
  );
};
