import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DeleteWarningPopover } from './DeleteWarningPopover';

if (typeof document.getAnimations !== 'function') {
  document.getAnimations = () => [];
}

const renderPopover = (props: Partial<Parameters<typeof DeleteWarningPopover>[0]> = {}) => {
  const allProps = {
    onPopoverDeleteClick: vi.fn(),
    onCancelClick: vi.fn(),
    setOpen: vi.fn(),
    deleteButtonText: 'Slett',
    cancelButtonText: 'Avbryt',
    messageText: 'Er du sikker?',
    open: true,
    ...props,
  };
  render(
    <DeleteWarningPopover {...allProps}>
      <button>Trigger</button>
    </DeleteWarningPopover>,
  );
  return allProps;
};

describe('DeleteWarningPopover', () => {
  it('renders the message and calls the button handlers', async () => {
    const props = renderPopover();
    expect(screen.getByText('Er du sikker?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Slett' }));
    expect(props.onPopoverDeleteClick).toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Avbryt' }));
    expect(props.onCancelClick).toHaveBeenCalled();
  });

  it('toggles the open state when the trigger is clicked', async () => {
    const props = renderPopover({ open: false });
    await userEvent.click(screen.getByRole('button', { name: 'Trigger' }));
    expect(props.setOpen).toHaveBeenCalledWith(true);
  });
});
