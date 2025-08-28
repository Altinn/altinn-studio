import React from 'react';
import { StudioPopover, type StudioPopoverProps } from './StudioPopover';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const triggerText: string = 'My trigger';
const contentText: string = 'Content';

describe('StudioPopover', () => {
  it('hides the content initially', () => {
    renderStudioPopover();

    const content = screen.queryByText(contentText);
    expect(content).not.toBeInTheDocument();
  });

  it('renders the popover content when the trigger is clicked', async () => {
    const user = userEvent.setup();
    renderStudioPopover();
    expect(screen.queryByText(contentText)).not.toBeInTheDocument();

    const button = screen.getByRole('button', { name: triggerText });
    await user.click(button);

    expect(screen.getByText(contentText)).toBeInTheDocument();
  });
});

const renderStudioPopover = (studioPopoverProps: Partial<StudioPopoverProps> = {}) => {
  return render(
    <StudioPopover {...studioPopoverProps}>
      <StudioPopover.Trigger>{triggerText}</StudioPopover.Trigger>
      <StudioPopover.Content>{contentText}</StudioPopover.Content>
    </StudioPopover>,
  );
};
