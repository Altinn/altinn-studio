import { Button } from '@digdir/designsystemet-react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ConfirmPopover, type ConfirmPopoverProps } from './ConfirmPopover';

if (typeof document.getAnimations !== 'function') {
  document.getAnimations = () => [];
}

const message = 'Are you sure?';
const confirmText = 'Yes, delete';
const cancelText = 'Cancel';

function renderConfirmPopover(props: Partial<ConfirmPopoverProps> = {}) {
  const mergedProps: ConfirmPopoverProps = {
    message,
    confirmText,
    cancelText,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    children: <Button>Delete</Button>,
    ...props,
  };
  render(<ConfirmPopover {...mergedProps} />);
  return mergedProps;
}

describe(' ConfirmPopover', () => {
  it('trigger the confirmation popover', () => {
    renderConfirmPopover();
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveAttribute('popovertarget');
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: confirmText })).toBeInTheDocument();
  });

  it('calls onConfirm only after confirming', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderConfirmPopover();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: confirmText }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel and does not confirm when cancelling', async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = renderConfirmPopover();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('renders the provided cancel label', async () => {
    const user = userEvent.setup();
    renderConfirmPopover({ cancelText: 'No, keep it' });
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('button', { name: 'No, keep it' })).toBeInTheDocument();
  });
});
