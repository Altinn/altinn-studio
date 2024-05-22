import React from 'react';
import {
  SelectCustomReceiptDatamodelId,
  type SelectCustomReceiptDatamodelIdProps,
} from './SelectCustomReceiptDatamodelId';
import { render, screen } from '@testing-library/react';
import { textMock } from '../../../../../../../../../testing/mocks/i18nMock';
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
const mockAvailableDatamodelIds: string[] = ['model1', 'model2'];

const defaultProps: SelectCustomReceiptDatamodelIdProps = {
  error: mockError,
  onChange: mockOnChange,
};

describe('SelectCustomReceiptDatamodelId', () => {
  afterEach(() => jest.clearAllMocks());

  it('calls onChange function when an option is selected', async () => {
    const user = userEvent.setup();
    renderSelectCustomReceiptDatamodelId({
      availableDataModelIds: mockAvailableDatamodelIds,
    });

    const selectElement = screen.getByLabelText(
      textMock('process_editor.configuration_panel_custom_receipt_select_datamodel_label'),
    );
    await user.click(selectElement);

    const optionElement = screen.getByRole('option', { name: mockAvailableDatamodelIds[0] });
    await user.selectOptions(selectElement, optionElement);

    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('displays the description when there are no available datamodel ids', () => {
    renderSelectCustomReceiptDatamodelId();

    const description = screen.getByText(
      textMock('process_editor.configuration_panel_custom_receipt_select_datamodel_description'),
    );
    expect(description).toBeInTheDocument();
  });

  it('hides the description when there are available datamodel ids', () => {
    renderSelectCustomReceiptDatamodelId({
      availableDataModelIds: mockAvailableDatamodelIds,
    });

    const description = screen.queryByText(
      textMock('process_editor.configuration_panel_custom_receipt_select_datamodel_description'),
    );
    expect(description).not.toBeInTheDocument();
  });
});

const renderSelectCustomReceiptDatamodelId = (
  bpmnApiContextProps: Partial<BpmnApiContextProps> = {},
) => {
  return render(
    <BpmnApiContext.Provider value={{ ...mockBpmnApiContextValue, ...bpmnApiContextProps }}>
      <BpmnContext.Provider value={{ ...mockBpmnContextValue }}>
        <BpmnConfigPanelFormContextProvider>
          <SelectCustomReceiptDatamodelId {...defaultProps} />
        </BpmnConfigPanelFormContextProvider>
      </BpmnContext.Provider>
    </BpmnApiContext.Provider>,
  );
};
