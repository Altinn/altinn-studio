import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { RemindChoiceDialog, type RemindChoiceDialogProps } from './RemindChoiceDialog';

describe('RemindChoiceDialog', () => {
  it('should call closeDialog when the "do show again" button is clicked', async () => {
    const props = {
      closeDialog: jest.fn(),
      closeDialogPermanently: jest.fn(),
    };

    renderRemindChoiceDialog(props);

    const user = userEvent.setup();

    await user.click(getCloseDialogButton());

    const popover = screen.getByText(textMock('session.reminder'));
    expect(popover).toBeInTheDocument();

    const hidePopoverTemporaryButton = screen.getByRole('button', {
      name: textMock('session.do_show_again'),
    });

    await user.click(hidePopoverTemporaryButton);

    expect(props.closeDialog).toHaveBeenCalled();
    expect(props.closeDialogPermanently).not.toHaveBeenCalled();
  });

  it('should call closeDialogPermanently when the "do not show again" is clicked', async () => {
    const props = {
      closeDialog: jest.fn(),
      closeDialogPermanently: jest.fn(),
    };

    renderRemindChoiceDialog(props);

    const user = userEvent.setup();

    await user.click(getCloseDialogButton());

    const popover = screen.getByText(textMock('session.reminder'));
    expect(popover).toBeInTheDocument();

    const hidePopoverForSessionButton = screen.getByRole('button', {
      name: textMock('session.dont_show_again'),
    });

    await user.click(hidePopoverForSessionButton);

    expect(props.closeDialog).not.toHaveBeenCalled();
    expect(props.closeDialogPermanently).toHaveBeenCalled();
  });
});

const getCloseDialogButton = (): HTMLButtonElement => {
  return screen.getByRole('button', { name: textMock('general.close') });
};

const renderRemindChoiceDialog = (props: RemindChoiceDialogProps) => {
  return render(<RemindChoiceDialog {...props} />);
};
