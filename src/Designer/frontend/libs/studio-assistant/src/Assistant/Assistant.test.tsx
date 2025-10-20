import React from 'react';
import { Assistant } from './Assistant';
import { render, screen } from '@testing-library/react';
import type { AssistantProps } from '../Assistant/Assistant';
import { mockTexts } from '../mocks/mockTexts';

// Test data
const onSubmitMessage = jest.fn();

describe('Assistant', () => {
  it('should render the complete chat interface by default', () => {
    renderAssistant();
    const assistantHeading = screen.getByRole('heading', { name: mockTexts.heading });
    const previewToggle = screen.getByRole('radio', { name: mockTexts.preview });
    const newThreadButton = screen.getByRole('button', { name: mockTexts.newThread });
    const sendButton = screen.getByRole('button', { name: mockTexts.send });

    expect(assistantHeading).toBeInTheDocument();
    expect(previewToggle).toBeInTheDocument();
    expect(newThreadButton).toBeInTheDocument();
    expect(sendButton).toBeInTheDocument();
  });

  it('should render the simplified chat interface when enableCompactInterface is true', () => {
    renderAssistant({ enableCompactInterface: true });
    const assistantHeading = screen.getByRole('heading', { name: mockTexts.heading });
    const previewToggle = screen.queryByRole('radio', { name: mockTexts.preview });
    const newThreadButton = screen.queryByRole('button', { name: mockTexts.newThread });
    const sendButton = screen.getByRole('button', { name: mockTexts.send });

    expect(assistantHeading).toBeInTheDocument();
    expect(previewToggle).not.toBeInTheDocument();
    expect(newThreadButton).not.toBeInTheDocument();
    expect(sendButton).toBeInTheDocument();
  });
});

const defaultProps: AssistantProps = {
  onSubmitMessage,
  texts: mockTexts,
  chatThreads: [],
};

const renderAssistant = (props?: Partial<AssistantProps>): void => {
  render(<Assistant {...defaultProps} {...props} />);
};
