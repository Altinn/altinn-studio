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

const mockExistingCustomReceiptLayoutSetId: string = mockBpmnApiContextValue.layoutSets.sets[0].id;
const layoutSetWithCustomReceipt: LayoutSetConfig = {
  id: mockExistingCustomReceiptLayoutSetId,
  tasks: [PROTECTED_TASK_NAME_CUSTOM_RECEIPT],
};
const layoutSetWithDataTask: LayoutSetConfig = {
  id: existingLayoutSetName,
  tasks: ['Task_1'],
};

const mockAvailableDatamodelIds: string[] = [mockBpmnApiContextValue.layoutSets.sets[1].dataType];

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

  it.each([
    invalidFormatLayoutSetName,
    emptyLayoutSetName,
    existingLayoutSetName,
    mockExistingCustomReceiptLayoutSetId,
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

    if (invalidLayoutSetId === emptyLayoutSetName) {
      await user.clear(inputField);
      await user.tab();
      const error = screen.getByText(textMock('validation_errors.required'));
      expect(error).toBeInTheDocument();
    } else {
      await user.clear(inputField);
      await user.type(inputField, invalidLayoutSetId);
      await user.tab();
    }
    if (invalidLayoutSetId === invalidFormatLayoutSetName) {
      const error = screen.getByText(textMock('ux_editor.pages_error_format'));
      expect(error).toBeInTheDocument();
    }
    if (invalidLayoutSetId === existingLayoutSetName) {
      const error = screen.getByText(
        textMock('process_editor.configuration_panel_layout_set_id_not_unique'),
      );
      expect(error).toBeInTheDocument();
    }
    expect(mockBpmnApiContextValue.mutateLayoutSet).not.toHaveBeenCalled();
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
      layoutSetIdToUpdate: mockExistingCustomReceiptLayoutSetId,
    });
  });
});

const renderCustomReceipt = (bpmnApiContextProps: Partial<BpmnApiContextProps> = {}) => {
  return render(
    <BpmnApiContext.Provider value={{ ...defaultBpmnContextProps, ...bpmnApiContextProps }}>
      <BpmnContext.Provider value={{ ...mockBpmnContextValue }}>
        <BpmnConfigPanelFormContextProvider>
          <CustomReceipt />
        </BpmnConfigPanelFormContextProvider>
      </BpmnContext.Provider>
    </BpmnApiContext.Provider>,
  );
};
