import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { RemindChoiceDialogProps } from './RemindChoiceDialog';
import { RemindChoiceDialog } from './RemindChoiceDialog';

const defaultProps: RemindChoiceDialogProps = {
  closeDialog: jest.fn(),
  closeDialogPermanently: jest.fn(),
};

describe('RemindChoiceDialog', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call closeDialog when the "do show again" button is clicked', async () => {
    renderRemindChoiceDialog();

    const user = userEvent.setup();

    const closeButton = screen.getByRole('button', { name: textMock('general.close') });
    await user.click(closeButton);

    const popover = screen.getByText(textMock('session.reminder'));
    expect(popover).toBeInTheDocument();

    const hidePopoverTemporaryButton = screen.getByRole('button', {
      name: textMock('session.do_show_again'),
    });

    await user.click(hidePopoverTemporaryButton);

    expect(defaultProps.closeDialog).toHaveBeenCalled();
    expect(defaultProps.closeDialogPermanently).not.toHaveBeenCalled();
  });

  it('should call closeDialogPermanently when the "do not show again" is clicked', async () => {
    renderRemindChoiceDialog();

    const user = userEvent.setup();

    // Open popover
    const closeButton = screen.getByRole('button', { name: textMock('general.close') });
    await user.click(closeButton);

    const popover = screen.getByText(textMock('session.reminder'));
    expect(popover).toBeInTheDocument();

    const hidePopoverForSessionButton = screen.getByRole('button', {
      name: textMock('session.dont_show_again'),
    });

    await user.click(hidePopoverForSessionButton);

    expect(defaultProps.closeDialog).not.toHaveBeenCalled();
    expect(defaultProps.closeDialogPermanently).toHaveBeenCalled();
  });
});

const renderRemindChoiceDialog = () => {
  return render(<RemindChoiceDialog {...defaultProps} />);
};
