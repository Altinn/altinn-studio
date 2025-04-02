import React from 'react';
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioDialog, type StudioDialogProps } from './';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';

describe('StudioDialog', () => {
  beforeEach(jest.clearAllMocks);

  it('Displays a dialog when the button is clicked', async () => {
    const user = userEvent.setup();
    renderStudioDialog();
    expect(getDialog()).not.toBeInTheDocument();
    await openDialog(user);
    expect(getDialog()).toBeInTheDocument();
  });

  it('Renders dialog content', async () => {
    const user = userEvent.setup();
    renderStudioDialog();
    await openDialog(user);
    expect(screen.getByText(dialogText)).toBeInTheDocument();
  });

  it('Renders triggerbutton with icon when provided', async () => {
    const user = userEvent.setup();
    renderStudioDialog({ triggerButtonIcon: icon1 });
    await openDialog(user);
    expect(screen.getByTestId(icon1TestId)).toBeInTheDocument();
  });

  it('applies custom data-size correctly', async () => {
    const user = userEvent.setup();
    renderStudioDialog({ 'data-size': 'lg' });
    await openDialog(user);
    expect(getDialog().getAttribute('data-size')).toBe('lg');
  });

  const openDialog = async (user: UserEvent): Promise<void> =>
    await user.click(screen.getByRole('button', { name: triggerButtonText }));
});

const triggerButtonText: string = 'Open';
const dialogText: string = 'Block 1';
const icon1TestId: string = 'Icon 1';
const icon1: ReactElement = <span data-testid={icon1TestId} />;

const defaultProps: StudioDialogProps = {
  triggerButtonText: triggerButtonText,
};

const renderStudioDialog = (props?: Partial<StudioDialogProps>): RenderResult => {
  return render(
    <StudioDialog {...defaultProps} {...props}>
      <StudioDialog.Block>
        <span>{dialogText}</span>
      </StudioDialog.Block>
    </StudioDialog>,
  );
};

const getDialog = (): HTMLDialogElement => screen.queryByRole('dialog');
