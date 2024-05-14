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

const mockOnCloseForm = jest.fn();
const mockAvailableDatamodelIds: string[] = ['model1', 'model2'];

const defaultProps: CreateCustomReceiptFormProps = {
  onCloseForm: mockOnCloseForm,
};

describe('CreateCustomReceiptForm', () => {
  afterEach(() => jest.clearAllMocks());

  it('submits the form with valid inputs', async () => {
    const user = userEvent.setup();

    const mockAddLayoutSet = jest.fn().mockImplementation(queryOptionMock);
    const mockMutateDataType = jest.fn().mockImplementation(queryOptionMock);

    renderCreateCustomReceiptForm({
      bpmnApiContextProps: {
        availableDataModelIds: mockAvailableDatamodelIds,
        addLayoutSet: mockAddLayoutSet,
        mutateDataType: mockMutateDataType,
      },
    });

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
});

type RenderProps = {
  bpmnApiContextProps: Partial<BpmnApiContextProps>;
  rootContextProps: Partial<BpmnContextProps>;
  componentProps: Partial<CreateCustomReceiptFormProps>;
};

const renderCreateCustomReceiptForm = (props: Partial<RenderProps> = {}) => {
  const { bpmnApiContextProps, rootContextProps, componentProps } = props;

  return render(
    <BpmnApiContext.Provider value={{ ...mockBpmnApiContextValue, ...bpmnApiContextProps }}>
      <BpmnContext.Provider value={{ ...mockBpmnContextValue, ...rootContextProps }}>
        <BpmnConfigPanelFormContextProvider>
          <CreateCustomReceiptForm {...defaultProps} {...componentProps} />
        </BpmnConfigPanelFormContextProvider>
      </BpmnContext.Provider>
    </BpmnApiContext.Provider>,
  );
};
