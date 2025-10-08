import React from 'react';
import { Assistant } from './Assistant';
import { render, screen } from '@testing-library/react';
import type { AssistantConfig } from '../types/AssistantConfig';

// Test data
const texts: AssistantConfig['texts'] = {
  heading: 'heading',
  preview: 'preview',
  fileBrowser: 'fileBrowser',
  hideThreads: 'hideThreads',
  newThread: 'newThread',
  previousThreads: 'previousThreads',
  aboutAssistant: 'aboutAssistant',
  textareaPlaceholder: 'textareaPlaceholder',
  addAttachment: 'addAttachment',
  agentModeLabel: 'agentModeLabel',
  send: 'send',
};
const onSubmitMessage = jest.fn();

describe('Assistant', () => {
  it('renders the component', () => {
    renderAssistant();
    const assistantHeader = screen.getByRole('heading', { name: texts.heading });
    const sendButton = screen.getByRole('button', { name: texts.send });
    expect(assistantHeader).toBeInTheDocument();
    expect(sendButton).toBeInTheDocument();
  });
});

const defaultProps: AssistantConfig = {
  onSubmitMessage,
  texts,
  enableSimpleMode: false,
  chatThreads: [],
};

const renderAssistant = (): void => {
  render(<Assistant {...defaultProps} />);
};
