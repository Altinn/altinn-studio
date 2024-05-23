import React from 'react';
import { CustomReceipt } from './CustomReceipt';
import { render, screen } from '@testing-library/react';
import { textMock } from '../../../../../../../../testing/mocks/i18nMock';
import { BpmnContext } from '../../../../../contexts/BpmnContext';
import userEvent from '@testing-library/user-event';
import { BpmnApiContext, type BpmnApiContextProps } from '../../../../../contexts/BpmnApiContext';
import { BpmnConfigPanelFormContextProvider } from '../../../../../contexts/BpmnConfigPanelContext';
import {
  mockBpmnApiContextValue,
  mockBpmnContextValue,
} from '../../../../../../test/mocks/bpmnContextMock';
import { type LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';

const invalidFormatLayoutSetName: string = 'Receipt/';
const emptyLayoutSetName: string = '';
const existingLayoutSetName: string = 'layoutSetName1';

const existingCustomReceiptLayoutSetId: string = mockBpmnApiContextValue.layoutSets.sets[0].id;
const layoutSetWithCustomReceipt: LayoutSetConfig = {
  id: existingCustomReceiptLayoutSetId,
  tasks: [PROTECTED_TASK_NAME_CUSTOM_RECEIPT],
};
const layoutSetWithDataTask: LayoutSetConfig = {
  id: existingLayoutSetName,
  tasks: ['Task_1'],
};

const layoutSetIdTextKeys: Record<string, string> = {
  [emptyLayoutSetName]: 'validation_errors.required',
  [invalidFormatLayoutSetName]: 'ux_editor.pages_error_format',
  [existingLayoutSetName]: 'process_editor.configuration_panel_layout_set_id_not_unique',
};

const mockAvailableDatamodelIds: string[] = [mockBpmnApiContextValue.layoutSets.sets[1].dataType];

const defaultBpmnContextProps: BpmnApiContextProps = {
  ...mockBpmnApiContextValue,
  existingCustomReceiptLayoutSetId: existingCustomReceiptLayoutSetId,
  availableDataModelIds: mockAvailableDatamodelIds,
};

describe('CustomReceipt', () => {
  afterEach(() => jest.clearAllMocks());

  it('calls "mutateLayoutSetId" when the layoutset id is changed', async () => {
    const user = userEvent.setup();
    renderCustomReceipt();

    const toggleableTextfieldButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_custom_receipt_textfield_label'),
    });

    await user.click(toggleableTextfieldButton);

    const textfield = screen.getByLabelText(
      textMock('process_editor.configuration_panel_custom_receipt_textfield_label'),
    );
    const newLayoutSetId: string = 'Test2';
    await user.clear(textfield);
    await user.type(textfield, newLayoutSetId);
    await user.tab();

    expect(mockBpmnApiContextValue.mutateLayoutSetId).toHaveBeenCalledTimes(1);
    expect(mockBpmnApiContextValue.mutateLayoutSetId).toHaveBeenCalledWith({
      layoutSetIdToUpdate: existingCustomReceiptLayoutSetId,
      newLayoutSetId,
    });
  });

  it('calls "mutateDataType" when the datamodel id is changed', async () => {
    const user = userEvent.setup();
    renderCustomReceipt();

    const propertyButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_set_datamodel'),
    });
    await user.click(propertyButton);

    const select = screen.getByLabelText(
      textMock('process_editor.configuration_panel_set_datamodel'),
    );
    await user.click(select);
    const newOption: string = mockAvailableDatamodelIds[0];
    const option = screen.getByRole('option', { name: newOption });
    await user.selectOptions(select, option);

    expect(mockBpmnApiContextValue.mutateDataType).toHaveBeenCalledTimes(1);
    expect(mockBpmnApiContextValue.mutateDataType).toHaveBeenCalledWith({
      connectedTaskId: PROTECTED_TASK_NAME_CUSTOM_RECEIPT,
      newDataType: newOption,
    });
  });

  it.each([
    invalidFormatLayoutSetName,
    emptyLayoutSetName,
    existingLayoutSetName,
    existingCustomReceiptLayoutSetId,
  ])('shows correct errormessage when layoutSetId is %s', async (invalidLayoutSetId: string) => {
    const user = userEvent.setup();
    renderCustomReceipt({
      layoutSets: { sets: [layoutSetWithCustomReceipt, layoutSetWithDataTask] },
    });

    const toggleableTextfieldButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_custom_receipt_textfield_label'),
    });

    await user.click(toggleableTextfieldButton);

    const inputField = screen.getByLabelText(
      textMock('process_editor.configuration_panel_custom_receipt_textfield_label'),
    );

    await user.clear(inputField);
    if (invalidLayoutSetId !== emptyLayoutSetName) await user.type(inputField, invalidLayoutSetId);
    await user.tab();

    const errorTextKey = layoutSetIdTextKeys[invalidLayoutSetId];

    if (errorTextKey) {
      const error = screen.getByText(textMock(errorTextKey));
      expect(error).toBeInTheDocument();
    }

    expect(mockBpmnApiContextValue.mutateLayoutSetId).not.toHaveBeenCalled();
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
    expect(mockBpmnApiContextValue.deleteLayoutSet).toHaveBeenCalledWith({
      layoutSetIdToUpdate: existingCustomReceiptLayoutSetId,
    });
  });
});

const renderCustomReceipt = (bpmnApiContextProps: Partial<BpmnApiContextProps> = {}) => {
  return render(
    <BpmnApiContext.Provider value={{ ...defaultBpmnContextProps, ...bpmnApiContextProps }}>
      <BpmnContext.Provider value={mockBpmnContextValue}>
        <BpmnConfigPanelFormContextProvider>
          <CustomReceipt />
        </BpmnConfigPanelFormContextProvider>
      </BpmnContext.Provider>
    </BpmnApiContext.Provider>,
  );
};
