import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { studioIconCardPopoverTrigger } from '@studio/testing/testids';
import { StudioIconCard } from './StudioIconCard';
import { ClipboardIcon } from '@studio/icons';

describe('StudioIconCard', () => {
  it('should render children as content', async () => {
    const divText = 'test-div';
    render(
      <StudioIconCard icon={<ClipboardIcon />}>
        <div>{divText}</div>
      </StudioIconCard>,
    );
    expect(screen.getByText(divText)).toBeInTheDocument();
  });

  it('should render icon prop', async () => {
    const iconTestId = 'icon-test-id';
    render(
      <StudioIconCard icon={<ClipboardIcon data-testid={iconTestId} />} iconColor='red'>
        <div></div>
      </StudioIconCard>,
    );
    expect(screen.getByTestId(iconTestId)).toBeInTheDocument();
  });

  it('should render clickable popover trigger for context buttons', async () => {
    const user = userEvent.setup();
    const buttonText = 'button-text';
    const contextButtons = <button>{buttonText}</button>;
    render(
      <StudioIconCard contextButtons={contextButtons} icon={<ClipboardIcon />}>
        <div></div>
      </StudioIconCard>,
    );
    await user.click(screen.getByTestId(studioIconCardPopoverTrigger));
    expect(screen.getByRole('button', { name: buttonText })).toBeInTheDocument();
  });
});
