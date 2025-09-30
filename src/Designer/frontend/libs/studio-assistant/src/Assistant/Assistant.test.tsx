import React from 'react';
import { Assistant } from './Assistant';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Test data
const heading = 'test-heading';
const sendButtonLabel = 'test-send';
const buttonTexts = {
  send: sendButtonLabel,
};
const onSubmitMessage = jest.fn();

describe('Assistant', () => {
  it('renders the component', () => {
    renderAssistant();
    const assistantHeader = screen.getByRole('heading', { name: heading });
    const sendButton = screen.getByRole('button', { name: sendButtonLabel });
    expect(assistantHeader).toBeInTheDocument();
    expect(sendButton).toBeInTheDocument();
  });

  it('calls onSubmitMessage when clicking the send button', async () => {
    const user = userEvent.setup();
    renderAssistant();
    const sendButton = screen.getByRole('button', { name: sendButtonLabel });
    await user.click(sendButton);
    expect(onSubmitMessage).toHaveBeenCalledTimes(1);
  });
});

const defaultProps = {
  heading: heading,
  buttonTexts: buttonTexts,
  onSubmitMessage,
};

const renderAssistant = (): void => {
  render(<Assistant {...defaultProps} />);
};
