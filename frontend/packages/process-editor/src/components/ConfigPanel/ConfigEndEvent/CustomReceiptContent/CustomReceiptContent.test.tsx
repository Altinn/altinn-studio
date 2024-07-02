import React from 'react';
import { CustomReceiptContent } from './CustomReceiptContent';
import { render, screen } from '@testing-library/react';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import { BpmnContext } from '../../../../contexts/BpmnContext';
import userEvent from '@testing-library/user-event';
import { BpmnApiContext, type BpmnApiContextProps } from '../../../../contexts/BpmnApiContext';
import { BpmnConfigPanelFormContextProvider } from '../../../../contexts/BpmnConfigPanelContext';
import {
  mockBpmnApiContextValue,
  mockBpmnContextValue,
} from '../../../../../test/mocks/bpmnContextMock';

describe('CustomReceiptContent', () => {
  afterEach(() => jest.clearAllMocks());

  it('Shows the spinner when there are pending API operations', () => {
    renderCustomReceiptContent({ pendingApiOperations: true });

    const spinner = screen.getByTitle(
      textMock('process_editor.configuration_panel_custom_receipt_spinner_title'),
    );
    expect(spinner).toBeInTheDocument();
  });

  it('Hides the spinner when there are no pending API operations', () => {
    renderCustomReceiptContent({ pendingApiOperations: false });

    const spinner = screen.queryByTitle(
      textMock('process_editor.configuration_panel_custom_receipt_spinner_title'),
    );
    expect(spinner).not.toBeInTheDocument();
  });

  it('Shows the add button when there are no existing custom receipt layout set id', () => {
    renderCustomReceiptContent();

    const addButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_custom_receipt_create_your_own_button'),
    });

    expect(addButton).toBeInTheDocument();
  });

  it('shows the create custom receipt form when the add custom form button is clicked', async () => {
    const user = userEvent.setup();
    renderCustomReceiptContent();

    const addButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_custom_receipt_create_your_own_button'),
    });

    expect(
      screen.queryByRole('textbox', {
        name: textMock('process_editor.configuration_panel_custom_receipt_textfield_label'),
      }),
    ).not.toBeInTheDocument();

    await user.click(addButton);

    expect(
      screen.getByRole('textbox', {
        name: textMock('process_editor.configuration_panel_custom_receipt_textfield_label'),
      }),
    ).toBeInTheDocument();
  });

  it('shows the add button when close button in add custom receipt form is clicked', async () => {
    const user = userEvent.setup();
    renderCustomReceiptContent();

    const addButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_custom_receipt_create_your_own_button'),
    });
    await user.click(addButton);

    expect(
      screen.queryByRole('button', {
        name: textMock('process_editor.configuration_panel_custom_receipt_create_your_own_button'),
      }),
    ).not.toBeInTheDocument();

    const cancelButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_custom_receipt_cancel_button'),
    });
    await user.click(cancelButton);

    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_custom_receipt_create_your_own_button'),
      }),
    ).toBeInTheDocument();
  });

  it('shows the custom receipt when there is an existing custom receipt layout set id', () => {
    renderCustomReceiptContent({
      existingCustomReceiptLayoutSetId: 'testId',
    });

    const toggleableTextfieldButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_custom_receipt_textfield_label'),
    });
    expect(toggleableTextfieldButton).toBeInTheDocument();
  });
});

const renderCustomReceiptContent = (bpmnApiContextProps: Partial<BpmnApiContextProps> = {}) => {
  return render(
    <BpmnApiContext.Provider value={{ ...mockBpmnApiContextValue, ...bpmnApiContextProps }}>
      <BpmnContext.Provider value={mockBpmnContextValue}>
        <BpmnConfigPanelFormContextProvider>
          <CustomReceiptContent />
        </BpmnConfigPanelFormContextProvider>
      </BpmnContext.Provider>
    </BpmnApiContext.Provider>,
  );
};
