import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PermissionPrompt, type PermissionPromptProps } from './PermissionPrompt';
import { permissionPromptTexts } from '../../../../mocks/mockTexts';

const permissionMessage = 'write_file: App/ui/Side1.json';

describe('PermissionPrompt', () => {
  it('renders the heading and the action awaiting consent', () => {
    renderPermissionPrompt();

    expect(screen.getByText(permissionPromptTexts.heading)).toBeInTheDocument();
    expect(screen.getByText(permissionMessage)).toBeInTheDocument();
  });

  it('calls onRespond with true when the user allows changes', async () => {
    const user = userEvent.setup();
    const onRespond = jest.fn();
    renderPermissionPrompt({ onRespond });

    await user.click(getAllowButton());

    expect(onRespond).toHaveBeenCalledTimes(1);
    expect(onRespond).toHaveBeenCalledWith(true);
  });

  it('calls onRespond with false when the user declines', async () => {
    const user = userEvent.setup();
    const onRespond = jest.fn();
    renderPermissionPrompt({ onRespond });

    await user.click(getDenyButton());

    expect(onRespond).toHaveBeenCalledTimes(1);
    expect(onRespond).toHaveBeenCalledWith(false);
  });
});

const getAllowButton = (): HTMLElement =>
  screen.getByRole('button', { name: permissionPromptTexts.allow });

const getDenyButton = (): HTMLElement =>
  screen.getByRole('button', { name: permissionPromptTexts.deny });

const defaultProps: PermissionPromptProps = {
  message: permissionMessage,
  texts: permissionPromptTexts,
  onRespond: jest.fn(),
};

const renderPermissionPrompt = (props: Partial<PermissionPromptProps> = {}): RenderResult =>
  render(<PermissionPrompt {...defaultProps} {...props} />);
