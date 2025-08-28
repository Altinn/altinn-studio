import React from 'react';
import {
  CreateCustomReceiptForm,
  type CreateCustomReceiptFormProps,
} from './CreateCustomReceiptForm';
import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { BpmnContext, type BpmnContextProps } from '../../../../../contexts/BpmnContext';
import userEvent from '@testing-library/user-event';
import { BpmnApiContext, type BpmnApiContextProps } from '../../../../../contexts/BpmnApiContext';
import { BpmnConfigPanelFormContextProvider } from '../../../../../contexts/BpmnConfigPanelContext';
import {
  mockBpmnApiContextValue,
  mockBpmnContextValue,
} from '../../../../../../test/mocks/bpmnContextMock';
import { queryOptionMock } from '../../../../../../test/mocks/queryOptionMock';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';

const mockAddLayoutSet = jest.fn().mockImplementation(queryOptionMock);
const mockOnCloseForm = jest.fn();
const mockAllDataModelIds: string[] = ['model1', 'model2'];

const defaultProps: CreateCustomReceiptFormProps = {
  onCloseForm: mockOnCloseForm,
};

const defaultBpmnApiContextProps: BpmnApiContextProps = {
  ...mockBpmnApiContextValue,
  allDataModelIds: mockAllDataModelIds,
  addLayoutSet: mockAddLayoutSet,
};

describe('CreateCustomReceiptForm', () => {
  afterEach(() => jest.clearAllMocks());

  it('Submits the form with valid inputs and calls "addLayoutSet", "mutateDataTypes", and "onCloseForm" when submit button is clicked', async () => {
    const user = userEvent.setup();
    renderCreateCustomReceiptForm();

    const layoutSetInput = screen.getByLabelText(
      textMock('process_editor.configuration_panel_custom_receipt_textfield_label'),
    );
    const newId: string = 'newLayoutSetId';
    await user.type(layoutSetInput, newId);

    const combobox = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_custom_receipt_select_data_model_label'),
    });
    await user.click(combobox);

    const optionElement = screen.getByRole('option', { name: mockAllDataModelIds[0] });
    await user.click(optionElement);

    const createButton = await screen.findByRole('button', {
      name: textMock('process_editor.configuration_panel_custom_receipt_create_button'),
    });
    await user.click(createButton);

    expect(mockAddLayoutSet).toHaveBeenCalledTimes(1);
    expect(mockAddLayoutSet).toHaveBeenCalledWith(
      {
        layoutSetConfig: {
          id: newId,
          dataType: mockAllDataModelIds[0],
          tasks: [PROTECTED_TASK_NAME_CUSTOM_RECEIPT],
        },
        layoutSetIdToUpdate: newId,
      },
      {
        onSuccess: expect.any(Function),
      },
    );
    expect(mockOnCloseForm).toHaveBeenCalled();
  });

  it('displays error when there are no value present for layout id', async () => {
    const user = userEvent.setup();
    renderCreateCustomReceiptForm();

    const combobox = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_custom_receipt_select_data_model_label'),
    });
    await user.click(combobox);

    const optionElement = screen.getByRole('option', { name: mockAllDataModelIds[0] });
    await user.click(optionElement);

    const createButton = await screen.findByRole('button', {
      name: textMock('process_editor.configuration_panel_custom_receipt_create_button'),
    });
    await user.click(createButton);

    const layoutIdError = screen.getByText(textMock('validation_errors.required'));
    expect(layoutIdError).toBeInTheDocument();

    const dataModelIdError = screen.queryByText(
      textMock('process_editor.configuration_panel_custom_receipt_create_data_model_error'),
    );
    expect(dataModelIdError).not.toBeInTheDocument();
    expect(mockOnCloseForm).toHaveBeenCalledTimes(0);
  });

  it('Displays error when there is just one character present for layouSetId', async () => {
    const user = userEvent.setup();
    renderCreateCustomReceiptForm();

    const layoutSetInput = screen.getByLabelText(
      textMock('process_editor.configuration_panel_custom_receipt_textfield_label'),
    );
    await user.type(layoutSetInput, 'a');

    const combobox = screen.getByRole('combobox', {
      name: textMock('process_editor.configuration_panel_custom_receipt_select_data_model_label'),
    });
    await user.click(combobox);

    const optionElement = screen.getByRole('option', { name: mockAllDataModelIds[0] });
    await user.click(optionElement);

    const createButton = await screen.findByRole('button', {
      name: textMock('process_editor.configuration_panel_custom_receipt_create_button'),
    });
    await user.click(createButton);

    const layoutIdError = screen.getByText(
      textMock('process_editor.configuration_panel_custom_receipt_layout_set_name_validation'),
    );
    expect(layoutIdError).toBeInTheDocument();

    const dataModelIdError = screen.queryByText(
      textMock('process_editor.configuration_panel_custom_receipt_create_data_model_error'),
    );
    expect(dataModelIdError).not.toBeInTheDocument();
    expect(mockOnCloseForm).toHaveBeenCalledTimes(0);
  });

  it('shows correct errormessage when layoutSetId is empty when typing in the textbox', async () => {
    const user = userEvent.setup();
    renderCreateCustomReceiptForm({
      bpmnApiContextProps: {
        addLayoutSet: mockAddLayoutSet,
      },
    });

    const inputField = screen.getByLabelText(
      textMock('process_editor.configuration_panel_custom_receipt_textfield_label'),
    );

    await user.type(inputField, 'a');
    await user.clear(inputField);

    const error = screen.getByText(textMock('validation_errors.required'));
    expect(error).toBeInTheDocument();

    const button = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_custom_receipt_create_button'),
    });
    await user.click(button);
    expect(mockAddLayoutSet).not.toHaveBeenCalled();
  });

  it('shows correct errormessage when layoutSetId is empty when clicking the submit button', async () => {
    const user = userEvent.setup();
    renderCreateCustomReceiptForm({
      bpmnApiContextProps: {
        addLayoutSet: mockAddLayoutSet,
      },
    });

    const button = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_custom_receipt_create_button'),
    });
    await user.click(button);

    const layoutSetIdError = screen.getByText(textMock('validation_errors.required'));
    expect(layoutSetIdError).toBeInTheDocument();

    expect(mockAddLayoutSet).not.toHaveBeenCalled();
  });

  it('shows correct errormessage when layoutSetId is invalid format', async () => {
    const user = userEvent.setup();
    renderCreateCustomReceiptForm({
      bpmnApiContextProps: {
        addLayoutSet: mockAddLayoutSet,
      },
    });

    const invalidFormatLayoutSetName: string = 'Receipt/';

    const inputField = screen.getByLabelText(
      textMock('process_editor.configuration_panel_custom_receipt_textfield_label'),
    );

    await user.type(inputField, invalidFormatLayoutSetName);

    const error = screen.getByText(textMock('validation_errors.name_invalid'));
    expect(error).toBeInTheDocument();

    const button = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_custom_receipt_create_button'),
    });
    await user.click(button);
    expect(mockAddLayoutSet).not.toHaveBeenCalled();
  });

  it('displays error when there are no value present for data model id', async () => {
    const user = userEvent.setup();
    renderCreateCustomReceiptForm({
      bpmnApiContextProps: { allDataModelIds: mockAllDataModelIds },
    });

    const layoutSetInput = screen.getByLabelText(
      textMock('process_editor.configuration_panel_custom_receipt_textfield_label'),
    );
    await user.type(layoutSetInput, 'newLayoutSetId');

    const createButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_custom_receipt_create_button'),
    });
    await user.click(createButton);

    const layoutIdError = screen.queryByText(textMock('validation_errors.required'));
    expect(layoutIdError).not.toBeInTheDocument();

    const dataModelIdError = screen.getByText(
      textMock('process_editor.configuration_panel_custom_receipt_create_data_model_error'),
    );
    expect(dataModelIdError).toBeInTheDocument();
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
    <BpmnApiContext.Provider value={{ ...defaultBpmnApiContextProps, ...bpmnApiContextProps }}>
      <BpmnContext.Provider value={{ ...mockBpmnContextValue, ...rootContextProps }}>
        <BpmnConfigPanelFormContextProvider>
          <CreateCustomReceiptForm {...defaultProps} {...componentProps} />
        </BpmnConfigPanelFormContextProvider>
      </BpmnContext.Provider>
    </BpmnApiContext.Provider>,
  );
};
