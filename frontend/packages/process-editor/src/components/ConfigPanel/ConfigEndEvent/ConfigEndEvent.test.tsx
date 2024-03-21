import React from 'react';
import { render as rtlRender, act, screen } from '@testing-library/react';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { ConfigEndEvent } from './ConfigEndEvent';
import type { LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import userEvent from '@testing-library/user-event';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';

describe('ConfigEndEvent', () => {
  it('should display the header for end event', () => {
    render();
    screen.getByText(textMock('process_editor.configuration_panel_end_event'));
  });

  it('should display informal text when no custom receipt layout set exists', () => {
    render();
    screen.getByText(textMock('process_editor.configuration_panel_custom_receipt_add'));
  });

  it('should display existing layout set name of receipt when custom receipt layout set exists', () => {
    const existingCustomReceiptLayoutSetName = 'CustomReceipt';
    render({ existingCustomReceiptName: existingCustomReceiptLayoutSetName });
    screen.getByText(textMock('process_editor.configuration_panel_custom_receipt_name'));
    screen.getByRole('button', { name: existingCustomReceiptLayoutSetName });
  });

  it('should call onUpdateLayoutSet when a custom receipt is created by adding a name to the input field', async () => {
    const customReceiptLayoutSetName = 'CustomReceipt';
    const updateLayoutSetMock = jest.fn();
    const user = userEvent.setup();
    render({ onUpdateLayoutSet: updateLayoutSetMock });
    const inputFieldButton = screen.getByTitle(
      textMock('process_editor.configuration_panel_custom_receipt_add'),
    );
    await act(() => user.click(inputFieldButton));
    const inputField = screen.getByTitle(
      textMock('process_editor.configuration_panel_custom_receipt_add_button_title'),
    );
    await act(() => user.type(inputField, customReceiptLayoutSetName));
    await act(() => user.tab());
    expect(updateLayoutSetMock).toHaveBeenCalledTimes(1);
    expect(updateLayoutSetMock).toHaveBeenCalledWith(customReceiptLayoutSetName, {
      id: customReceiptLayoutSetName,
      tasks: [PROTECTED_TASK_NAME_CUSTOM_RECEIPT],
    });
  });

  it('should call onUpdateLayoutSet when a custom receipt is updated by changing the name in the input field', async () => {
    const existingCustomReceiptLayoutSetName = 'CustomReceipt';
    const newCustomReceiptLayoutSetName = 'newCustomReceipt';
    const updateLayoutSetMock = jest.fn();
    const user = userEvent.setup();
    render({
      existingCustomReceiptName: existingCustomReceiptLayoutSetName,
      onUpdateLayoutSet: updateLayoutSetMock,
    });
    const inputFieldButton = screen.getByTitle(
      textMock('process_editor.configuration_panel_custom_receipt_add'),
    );
    await act(() => user.click(inputFieldButton));
    const inputField = screen.getByTitle(
      textMock('process_editor.configuration_panel_custom_receipt_add_button_title'),
    );
    await act(() => user.clear(inputField));
    await act(() => user.type(inputField, newCustomReceiptLayoutSetName));
    await act(() => user.tab());
    expect(updateLayoutSetMock).toHaveBeenCalledTimes(1);
    expect(updateLayoutSetMock).toHaveBeenCalledWith(existingCustomReceiptLayoutSetName, {
      id: newCustomReceiptLayoutSetName,
      tasks: [PROTECTED_TASK_NAME_CUSTOM_RECEIPT],
    });
  });
});

const render = ({
  existingCustomReceiptName = undefined,
  onUpdateLayoutSet = jest.fn(),
}: {
  existingCustomReceiptName?: string | undefined;
  onUpdateLayoutSet?: (layoutSetIdToUpdate: string, layoutSetConfig: LayoutSetConfig) => void;
} = {}) => {
  return rtlRender(
    <ConfigEndEvent
      existingCustomReceiptName={existingCustomReceiptName}
      onUpdateLayoutSet={onUpdateLayoutSet}
    />,
  );
};
