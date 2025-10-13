import React from 'react';
import { CompactInterface } from './CompactInterface';
import { render, screen } from '@testing-library/react';
import type { CompactInterfaceProps } from './CompactInterface';
import { mockTexts } from '../../mocks/mockTexts';

// Test data
const onSubmitMessage = jest.fn();

describe('CompactInterface', () => {
  it('should render the heading', () => {
    renderCompactInterface();
    const heading = screen.getByRole('heading', { name: mockTexts.heading });

    expect(heading).toBeInTheDocument();
  });

  it('should render the chat input', () => {
    renderCompactInterface();
    const textarea = screen.getByPlaceholderText(mockTexts.textareaPlaceholder);

    expect(textarea).toBeInTheDocument();
  });

  it('should render the send button', () => {
    renderCompactInterface();
    const sendButton = screen.getByRole('button', { name: mockTexts.send });

    expect(sendButton).toBeInTheDocument();
  });

  it('should render the greeting message', () => {
    renderCompactInterface();
    const greetingMessage = screen.getByText(mockTexts.assistantFirstMessage);

    expect(greetingMessage).toBeInTheDocument();
  });

  it('should not render attachment button', () => {
    renderCompactInterface();
    const attachmentButton = screen.queryByRole('button', { name: mockTexts.addAttachment });

    expect(attachmentButton).not.toBeInTheDocument();
  });

  it('should not render "allow app changes" switch', () => {
    renderCompactInterface();
    const allowAppChangesSwitch = screen.queryByRole('checkbox', { name: mockTexts.allowAppChangesSwitch });

    expect(allowAppChangesSwitch).not.toBeInTheDocument();
  });
});

const defaultProps: CompactInterfaceProps = {
  texts: mockTexts,
  onSubmitMessage,
};

const renderCompactInterface = (props?: Partial<CompactInterfaceProps>): void => {
  render(<CompactInterface {...defaultProps} {...props} />);
};
