import React from 'react';
import {
  SelectCustomReceiptDataModelId,
  type SelectCustomReceiptDataModelIdProps,
} from './SelectCustomReceiptDataModelId';
import { render, screen, waitFor } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { BpmnContext } from '../../../../../../contexts/BpmnContext';
import userEvent from '@testing-library/user-event';
import {
  BpmnApiContext,
  type BpmnApiContextProps,
} from '../../../../../../contexts/BpmnApiContext';
import { BpmnConfigPanelFormContextProvider } from '../../../../../../contexts/BpmnConfigPanelContext';
import {
  mockBpmnApiContextValue,
  mockBpmnContextValue,
} from '../../../../../../../test/mocks/bpmnContextMock';

const mockError: string = 'Error';
const mockOnChange = jest.fn();
const mockAllDataModelIds: string[] = ['model1', 'model2'];

const defaultProps: SelectCustomReceiptDataModelIdProps = {
  error: mockError,
  onChange: mockOnChange,
};

describe('SelectCustomReceiptDataModelId', () => {
  afterEach(() => jest.clearAllMocks());

  it('calls onChange function when an option is selected', async () => {
    const user = userEvent.setup();
    renderSelectCustomReceiptDataModelId({
      allDataModelIds: mockAllDataModelIds,
    });

    const combobox = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_custom_receipt_select_data_model_label'),
    });
    await user.click(combobox);

    const optionElement = screen.getByRole('option', { name: mockAllDataModelIds[0] });
    await user.click(optionElement);

    await waitFor(() => expect(mockOnChange).toHaveBeenCalledTimes(1));
  });

  it('should display a combobox without value and an empty combobox element informing that data models are missing when clicking "add data model" when there are no data models', async () => {
    const user = userEvent.setup();
    renderSelectCustomReceiptDataModelId({
      allDataModelIds: [],
    });

    const combobox = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_custom_receipt_select_data_model_label'),
    });

    await user.click(combobox);
    expect(combobox).not.toHaveValue();

    const noAvailableModelsOption = screen.getByText(
      textMock('process_editor.configuration_panel_no_data_model_to_select'),
    );
    expect(noAvailableModelsOption).toBeInTheDocument();
  });
});

const renderSelectCustomReceiptDataModelId = (
  bpmnApiContextProps: Partial<BpmnApiContextProps> = {},
) => {
  return render(
    <BpmnApiContext.Provider value={{ ...mockBpmnApiContextValue, ...bpmnApiContextProps }}>
      <BpmnContext.Provider value={mockBpmnContextValue}>
        <BpmnConfigPanelFormContextProvider>
          <SelectCustomReceiptDataModelId {...defaultProps} />
        </BpmnConfigPanelFormContextProvider>
      </BpmnContext.Provider>
    </BpmnApiContext.Provider>,
  );
};
