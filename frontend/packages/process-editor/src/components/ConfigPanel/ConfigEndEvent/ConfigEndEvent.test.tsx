import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { ConfigEndEvent } from './ConfigEndEvent';
import userEvent from '@testing-library/user-event';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import type { LayoutSetConfig, LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { useBpmnApiContext } from '../../../contexts/BpmnApiContext';

jest.mock('../../../contexts/BpmnApiContext', () => ({
  useBpmnApiContext: jest.fn().mockReturnValue({
    layoutSets: {},
    existingCustomReceiptLayoutSetId: undefined,
    addLayoutSet: jest.fn(),
    mutateLayoutSet: jest.fn(),
  }),
}));

// Test data
const invalidFormatLayoutSetName: string = 'Receipt/';
const emptyLayoutSetName: string = '';
const existingLayoutSetName: string = 'layoutSetName1';
const existingCustomReceiptLayoutSetId: string = 'CustomReceipt';
const layoutSetWithCustomReceipt: LayoutSetConfig = {
  id: existingCustomReceiptLayoutSetId,
  tasks: [PROTECTED_TASK_NAME_CUSTOM_RECEIPT],
};
const layoutSetWithDataTask: LayoutSetConfig = {
  id: existingLayoutSetName,
  tasks: ['Task_1'],
};
const layoutSetsWithCustomReceipt: LayoutSets = { sets: [layoutSetWithCustomReceipt] };

describe('ConfigEndEvent', () => {
  it('should display the header for end event', () => {
    renderConfigEndEventPanel();
    screen.getByText(textMock('process_editor.configuration_panel_end_event'));
  });

  it('should display informal text when no custom receipt layout set exists', () => {
    renderConfigEndEventPanel();
    screen.getByText(textMock('process_editor.configuration_panel_custom_receipt_add'));
  });

  it('should display existing layout set name of receipt when custom receipt layout set exists', () => {
    (useBpmnApiContext as jest.Mock).mockReturnValue({
      existingCustomReceiptLayoutSetId,
    });
    renderConfigEndEventPanel();
    screen.getByText(textMock('process_editor.configuration_panel_custom_receipt_name'));
    screen.getByRole('button', { name: existingCustomReceiptLayoutSetId });
  });

  it('calls addLayoutSet mutation when layoutSetName for custom receipt is added', async () => {
    const customReceiptLayoutSetName = 'CustomReceipt';
    const user = userEvent.setup();
    const addLayoutSetMock = jest.fn();
    (useBpmnApiContext as jest.Mock).mockReturnValue({
      layoutSets: { sets: [layoutSetWithDataTask] },
      addLayoutSet: addLayoutSetMock,
    });
    renderConfigEndEventPanel();
    const inputFieldButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_custom_receipt_add'),
    });
    await user.click(inputFieldButton);
    const inputField = screen.getByRole('textbox', {
      name: textMock('process_editor.configuration_panel_custom_receipt_add_button_title'),
    });
    await user.type(inputField, customReceiptLayoutSetName);
    await user.tab();
    expect(addLayoutSetMock).toHaveBeenCalledTimes(1);
    expect(addLayoutSetMock).toHaveBeenCalledWith({
      layoutSetIdToUpdate: undefined,
      layoutSetConfig: {
        id: customReceiptLayoutSetName,
        tasks: [PROTECTED_TASK_NAME_CUSTOM_RECEIPT],
      },
    });
  });

  it('calls updateLayoutSet mutation when layoutSetName for custom receipt is changed', async () => {
    const newCustomReceiptLayoutSetName = 'NewCustomReceipt';
    const user = userEvent.setup();
    const updateLayoutSetMock = jest.fn();
    (useBpmnApiContext as jest.Mock).mockReturnValue({
      layoutSets: layoutSetsWithCustomReceipt,
      existingCustomReceiptLayoutSetId,
      mutateLayoutSet: updateLayoutSetMock,
    });
    renderConfigEndEventPanel();
    const inputFieldButton = screen.getByRole('button', {
      name: existingCustomReceiptLayoutSetId,
    });
    await user.click(inputFieldButton);
    const inputField = screen.getByRole('textbox', {
      name: textMock('process_editor.configuration_panel_custom_receipt_add_button_title'),
    });
    await user.clear(inputField);
    await user.type(inputField, newCustomReceiptLayoutSetName);
    await user.tab();
    expect(updateLayoutSetMock).toHaveBeenCalledTimes(1);
    expect(updateLayoutSetMock).toHaveBeenCalledWith({
      layoutSetIdToUpdate: existingCustomReceiptLayoutSetId,
      newLayoutSetId: newCustomReceiptLayoutSetName,
    });
  });
  it.each([
    invalidFormatLayoutSetName,
    emptyLayoutSetName,
    existingLayoutSetName,
    existingCustomReceiptLayoutSetId,
  ])('shows correct errormessage when layoutSetId is %s', async (invalidLayoutSetId: string) => {
    const user = userEvent.setup();
    const updateLayoutSetMock = jest.fn();
    (useBpmnApiContext as jest.Mock).mockReturnValue({
      layoutSets: { sets: [layoutSetWithCustomReceipt, layoutSetWithDataTask] },
      existingCustomReceiptLayoutSetId,
      mutateLayoutSet: updateLayoutSetMock,
    });
    renderConfigEndEventPanel();
    const inputFieldButton = screen.getByRole('button', {
      name: existingCustomReceiptLayoutSetId,
    });
    await user.click(inputFieldButton);
    const inputField = screen.getByRole('textbox', {
      name: textMock('process_editor.configuration_panel_custom_receipt_add_button_title'),
    });
    if (invalidLayoutSetId === emptyLayoutSetName) {
      await user.clear(inputField);
      await user.tab();
      screen.getByText(textMock('validation_errors.required'));
    } else {
      await user.clear(inputField);
      await user.type(inputField, invalidLayoutSetId);
      await user.tab();
    }
    if (invalidLayoutSetId === invalidFormatLayoutSetName)
      screen.getByText(textMock('ux_editor.pages_error_format'));
    if (invalidLayoutSetId === existingLayoutSetName)
      screen.getByText(textMock('process_editor.configuration_panel_layout_set_id_not_unique'));
    expect(updateLayoutSetMock).not.toHaveBeenCalled();
  });
});

const renderConfigEndEventPanel = () => {
  return rtlRender(<ConfigEndEvent />);
};
