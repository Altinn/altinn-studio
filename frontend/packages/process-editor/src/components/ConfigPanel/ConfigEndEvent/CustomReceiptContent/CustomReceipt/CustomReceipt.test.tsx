import React from 'react';
import { CustomReceipt } from './CustomReceipt';
import { render, screen } from '@testing-library/react';
import { textMock } from '../../../../../../../../testing/mocks/i18nMock';
import { BpmnContext, type BpmnContextProps } from '../../../../../contexts/BpmnContext';
import userEvent from '@testing-library/user-event';
import { BpmnApiContext, type BpmnApiContextProps } from '../../../../../contexts/BpmnApiContext';
import { BpmnConfigPanelFormContextProvider } from '../../../../../contexts/BpmnConfigPanelContext';
import {
  mockBpmnApiContextValue,
  mockBpmnContextValue,
} from '../../../../../../test/mocks/bpmnContextMock';

const mockAvailableDatamodelIds: string[] = [mockBpmnApiContextValue.layoutSets.sets[1].dataType];
const mockExistingCustomReceiptLayoutSetId: string = mockBpmnApiContextValue.layoutSets.sets[0].id; //  'testId';

const defaultBpmnContextProps: BpmnApiContextProps = {
  ...mockBpmnApiContextValue,
  existingCustomReceiptLayoutSetId: mockExistingCustomReceiptLayoutSetId,
  availableDataModelIds: mockAvailableDatamodelIds,
};

describe('CustomReceipt', () => {
  afterEach(() => jest.clearAllMocks());

  it('calls "mutateLayoutSet" when the layoutset id is changed', async () => {
    const user = userEvent.setup();
    renderCustomReceipt();

    const toggleableTextfieldButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_custom_receipt_textfield_label'),
    });

    await user.click(toggleableTextfieldButton);

    const textfield = screen.getByLabelText(
      textMock('process_editor.configuration_panel_custom_receipt_textfield_label'),
    );
    const newLayoutsetId: string = 'Test2';
    await user.clear(textfield);
    await user.type(textfield, newLayoutsetId);
    await user.tab();

    expect(mockBpmnApiContextValue.mutateLayoutSet).toHaveBeenCalledTimes(1);
  });

  it('calls "mutateDataType" when the datamodel id is changed', async () => {
    const user = userEvent.setup();
    renderCustomReceipt();

    const properyButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_set_datamodel'),
    });
    await user.click(properyButton);

    const select = screen.getByLabelText(
      textMock('process_editor.configuration_panel_set_datamodel'),
    );
    await user.click(select);
    const option = screen.getByRole('option', { name: mockAvailableDatamodelIds[0] });
    await user.selectOptions(select, option);

    expect(mockBpmnApiContextValue.mutateDataType).toHaveBeenCalledTimes(1);
  });

  it('gives an error when trying to save layoutset id that is empty', async () => {
    const user = userEvent.setup();
    renderCustomReceipt();

    const toggleableTextfieldButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_custom_receipt_textfield_label'),
    });

    await user.click(toggleableTextfieldButton);

    const textfield = screen.getByLabelText(
      textMock('process_editor.configuration_panel_custom_receipt_textfield_label'),
    );
    await user.clear(textfield);

    expect(mockBpmnApiContextValue.mutateLayoutSet).toHaveBeenCalledTimes(0);

    const layoutIdError = screen.getByText(textMock('validation_errors.required'));
    expect(layoutIdError).toBeInTheDocument();
  });

  it('calls "deleteLayoutSet" when clicking delete layoutset', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    renderCustomReceipt();

    const deleteButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_custom_receipt_delete_button'),
    });
    await user.click(deleteButton);
    expect(mockBpmnApiContextValue.deleteLayoutSet).toHaveBeenCalledTimes(1);
  });
});

type RenderProps = {
  bpmnApiContextProps: Partial<BpmnApiContextProps>;
  rootContextProps: Partial<BpmnContextProps>;
};

const renderCustomReceipt = (props: Partial<RenderProps> = {}) => {
  const { bpmnApiContextProps, rootContextProps } = props;

  return render(
    <BpmnApiContext.Provider value={{ ...defaultBpmnContextProps, ...bpmnApiContextProps }}>
      <BpmnContext.Provider value={{ ...mockBpmnContextValue, ...rootContextProps }}>
        <BpmnConfigPanelFormContextProvider>
          <CustomReceipt />
        </BpmnConfigPanelFormContextProvider>
      </BpmnContext.Provider>
    </BpmnApiContext.Provider>,
  );
};
