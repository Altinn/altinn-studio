import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { HelpText } from './HelpText';
import type { HelpTextProps } from './HelpText';

const renderHelpText = (props: Partial<HelpTextProps> = {}) =>
  render(
    <HelpText title='Helptext for test' {...props}>
      Help
    </HelpText>,
  );

describe('HelpText', () => {
  it('should render HelpText button', () => {
    renderHelpText();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should compose aria-label from titlePrefix and title', () => {
    renderHelpText({ titlePrefix: 'Help for', title: 'My field' });
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Help for My field');
  });

  it('should omit aria-label when no title is given', () => {
    renderHelpText({ title: undefined });
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-label');
  });

  it('should open HelpText on trigger-click when closed', async () => {
    const user = userEvent.setup();
    renderHelpText();
    const trigger = screen.getByRole('button');

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('should close HelpText on trigger-click when open', async () => {
    const user = userEvent.setup();
    renderHelpText();
    const trigger = screen.getByRole('button');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('should open HelpText on SPACE pressed when closed', async () => {
    const user = userEvent.setup();
    renderHelpText();
    const trigger = screen.getByRole('button');

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    trigger.focus();
    await user.keyboard('[Space]');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('should close HelpText on ESC pressed when open', async () => {
    const user = userEvent.setup();
    renderHelpText();
    const trigger = screen.getByRole('button');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('[Escape]');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
