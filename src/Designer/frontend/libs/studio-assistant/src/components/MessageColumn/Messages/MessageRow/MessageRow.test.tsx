import { MessageRow, type MessageRowProps } from './MessageRow';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';

const label = 'Sender name';
const childText = 'Message body';

describe('MessageRow', () => {
  it('renders the sender label', () => {
    renderMessageRow();

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('renders the children', () => {
    renderMessageRow();

    expect(screen.getByText(childText)).toBeInTheDocument();
  });
});

const defaultProps: MessageRowProps = {
  label,
  variant: 'user',
  children: <span>{childText}</span>,
};

const renderMessageRow = (props: Partial<MessageRowProps> = {}): RenderResult =>
  render(<MessageRow {...defaultProps} {...props} />);
