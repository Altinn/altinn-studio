import type { ComponentProps } from 'react';

import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DeleteWarningPopover } from './DeleteWarningPopover';

if (typeof document.getAnimations !== 'function') {
  document.getAnimations = () => [];
}

const render = (props?: Partial<ComponentProps<typeof DeleteWarningPopover>>) =>
  renderWithTranslations(
    <DeleteWarningPopover
      onPopoverDeleteClick={() => {}}
      onCancelClick={() => {}}
      deleteButtonText='Bekreft'
      messageText='Er du sikker på at du vil endre?'
      open
      setOpen={() => {}}
      {...props}
    >
      <button type='button'>Endre</button>
    </DeleteWarningPopover>,
  );

describe('DeleteWarningPopover', () => {
  it('renders the message and the confirm/cancel buttons when open', () => {
    render();
    expect(screen.getByTestId('delete-warning-popover')).toBeInTheDocument();
    expect(screen.getByText('Er du sikker på at du vil endre?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bekreft' })).toBeInTheDocument();
    // The cancel label comes from the translation context (general.cancel → 'Cancel' in English).
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('calls onPopoverDeleteClick when the confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onPopoverDeleteClick = vi.fn();
    render({ onPopoverDeleteClick });

    await user.click(screen.getByRole('button', { name: 'Bekreft' }));

    expect(onPopoverDeleteClick).toHaveBeenCalledTimes(1);
  });

  it('calls onCancelClick when the cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancelClick = vi.fn();
    render({ onCancelClick });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancelClick).toHaveBeenCalledTimes(1);
  });
});
