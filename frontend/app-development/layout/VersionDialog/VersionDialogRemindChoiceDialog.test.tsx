import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { VersionDialogRemindChoiceDialogProps } from './VersionDialogRemindChoiceDialog';
import { VersionDialogRemindChoiceDialog } from './VersionDialogRemindChoiceDialog';
import { textMock } from '@studio/testing/mocks/i18nMock';

const defaultProps: VersionDialogRemindChoiceDialogProps = {
  closeDialog: jest.fn(),
  closeDialogPermanently: jest.fn(),
};

describe('VersionDialogRemindChoiceDialog', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component', async () => {
    render(<VersionDialogRemindChoiceDialog {...defaultProps} />);

    const user = userEvent.setup();

    // Open popover
    const popover = screen.getByText(textMock('session.reminder'));
    expect(popover).toBeInTheDocument();
    const hidePopoverTemporaryButton = screen.getByRole('button', {
      name: textMock('session.do_show_again'),
    });

    // Click hide temporary button
    await user.click(hidePopoverTemporaryButton);

    expect(popover).not.toBeInTheDocument();
    expect(defaultProps.closeDialogPermanently).not.toHaveBeenCalled();
  });
});
