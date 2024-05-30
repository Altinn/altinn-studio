import React from 'react';
import {
  SelectCustomReceiptDataModelId,
  type SelectCustomReceiptDataModelIdProps,
} from './SelectCustomReceiptDataModelId';
import { render, screen } from '@testing-library/react';
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

    const selectElement = screen.getByLabelText(
      textMock('process_editor.configuration_panel_custom_receipt_select_data_model_label'),
    );
    await user.click(selectElement);

    const optionElement = screen.getByRole('option', { name: mockAllDataModelIds[0] });
    await user.selectOptions(selectElement, optionElement);

    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('displays the description when there are no available data model ids', () => {
    renderSelectCustomReceiptDataModelId();

    const description = screen.getByText(
      textMock('process_editor.configuration_panel_custom_receipt_select_data_model_description'),
    );
    expect(description).toBeInTheDocument();
  });

  it('hides the description when there are available data model ids', () => {
    renderSelectCustomReceiptDataModelId({
      allDataModelIds: mockAllDataModelIds,
    });

    const description = screen.queryByText(
      textMock('process_editor.configuration_panel_custom_receipt_select_data_model_description'),
    );
    expect(description).not.toBeInTheDocument();
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
