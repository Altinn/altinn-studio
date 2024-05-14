import React from 'react';
import {
  CreateCustomReceiptForm,
  type CreateCustomReceiptFormProps,
} from './CreateCustomReceiptForm';
import { render, screen, waitFor } from '@testing-library/react';
import { textMock } from '../../../../../../../../testing/mocks/i18nMock';
import { BpmnContext, type BpmnContextProps } from '../../../../../contexts/BpmnContext';
import userEvent from '@testing-library/user-event';
import { BpmnApiContext, type BpmnApiContextProps } from '../../../../../contexts/BpmnApiContext';
import { BpmnConfigPanelFormContextProvider } from '../../../../../contexts/BpmnConfigPanelContext';
import {
  mockBpmnApiContextValue,
  mockBpmnContextValue,
} from '../../../../../../test/mocks/bpmnContextMock';
import { queryOptionMock } from 'app-shared/mocks/queryOptionMock';

const mockAddLayoutSet = jest.fn().mockImplementation(queryOptionMock);
const mockMutateDataType = jest.fn().mockImplementation(queryOptionMock);

const mockOnCloseForm = jest.fn();
const mockAvailableDatamodelIds: string[] = ['model1', 'model2'];

const defaultProps: CreateCustomReceiptFormProps = {
  onCloseForm: mockOnCloseForm,
};

const defaultBpmnContextProps: BpmnApiContextProps = {
  ...mockBpmnApiContextValue,
  availableDataModelIds: mockAvailableDatamodelIds,
  addLayoutSet: mockAddLayoutSet,
  mutateDataType: mockMutateDataType,
};

describe('CreateCustomReceiptForm', () => {
  afterEach(() => jest.clearAllMocks());

  it('Submits the form with valid inputs and calls "addLayoutSet", "mutateDataType", and "onCloseForm" when submit button is clicked', async () => {
    const user = userEvent.setup();
    renderCreateCustomReceiptForm();

    const layoutSetInput = screen.getByLabelText(
      textMock('process_editor.configuration_panel_custom_receipt_textfield_label'),
    );
    await user.type(layoutSetInput, 'newLayoutSetId');

    const selectElement = screen.getByLabelText(
      textMock('process_editor.configuration_panel_custom_receipt_select_datamodel_label'),
    );
    await user.click(selectElement);

    const optionElement = screen.getByRole('option', { name: mockAvailableDatamodelIds[0] });
    await user.selectOptions(selectElement, optionElement);

    const createButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_custom_receipt_create_button'),
    });
    await user.click(createButton);

    await waitFor(() => expect(mockAddLayoutSet).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockMutateDataType).toHaveBeenCalledTimes(1));
    expect(mockOnCloseForm).toHaveBeenCalled();
  });

  it('displays error when there are no value present for layout id', async () => {
    const user = userEvent.setup();
    renderCreateCustomReceiptForm();

    const selectElement = screen.getByLabelText(
      textMock('process_editor.configuration_panel_custom_receipt_select_datamodel_label'),
    );
    await user.click(selectElement);

    const optionElement = screen.getByRole('option', { name: mockAvailableDatamodelIds[0] });
    await user.selectOptions(selectElement, optionElement);

    const createButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_custom_receipt_create_button'),
    });
    await user.click(createButton);

    const layoutIdError = screen.getByText(textMock('validation_errors.required'));
    expect(layoutIdError).toBeInTheDocument();

    const datamodelIdError = screen.queryByText(
      textMock('process_editor.configuration_panel_custom_receipt_create_datamodel_error'),
    );
    expect(datamodelIdError).not.toBeInTheDocument();
    expect(mockOnCloseForm).toHaveBeenCalledTimes(0);
  });

  it('displays error when there are no value present for datamodel id', async () => {
    const user = userEvent.setup();
    renderCreateCustomReceiptForm({ bpmnApiContextProps: mockBpmnApiContextValue });

    const layoutSetInput = screen.getByLabelText(
      textMock('process_editor.configuration_panel_custom_receipt_textfield_label'),
    );
    await user.type(layoutSetInput, 'newLayoutSetId');

    const selectElement = screen.getByLabelText(
      textMock('process_editor.configuration_panel_custom_receipt_select_datamodel_label'),
    );
    await user.click(selectElement);

    const createButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_custom_receipt_create_button'),
    });
    await user.click(createButton);

    const layoutIdError = screen.queryByText(textMock('validation_errors.required'));
    expect(layoutIdError).not.toBeInTheDocument();

    const datamodelIdError = screen.getByText(
      textMock('process_editor.configuration_panel_custom_receipt_create_datamodel_error'),
    );
    expect(datamodelIdError).toBeInTheDocument();
    expect(mockOnCloseForm).toHaveBeenCalledTimes(0);
  });

  it('calls "onCloseForm" when cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderCreateCustomReceiptForm();

    const cancelButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_custom_receipt_cancel_button'),
    });

    await user.click(cancelButton);
    expect(mockOnCloseForm).toHaveBeenCalledTimes(1);
  });
});

type RenderProps = {
  bpmnApiContextProps: Partial<BpmnApiContextProps>;
  rootContextProps: Partial<BpmnContextProps>;
  componentProps: Partial<CreateCustomReceiptFormProps>;
};

const renderCreateCustomReceiptForm = (props: Partial<RenderProps> = {}) => {
  const { bpmnApiContextProps, rootContextProps, componentProps } = props;

  return render(
    <BpmnApiContext.Provider value={{ ...defaultBpmnContextProps, ...bpmnApiContextProps }}>
      <BpmnContext.Provider value={{ ...mockBpmnContextValue, ...rootContextProps }}>
        <BpmnConfigPanelFormContextProvider>
          <CreateCustomReceiptForm {...defaultProps} {...componentProps} />
        </BpmnConfigPanelFormContextProvider>
      </BpmnContext.Provider>
    </BpmnApiContext.Provider>,
  );
};
