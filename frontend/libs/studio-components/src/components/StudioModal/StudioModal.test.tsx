import React, { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { StudioModal, StudioModalProps } from './StudioModal';

const mockHeaderText: string = 'Title';
const mockContentText: string = 'Modal test';
const mockFooterText: string = 'Footer content';

const MockHeader: ReactNode = (
  <div>
    <h3>{mockHeaderText}</h3>
  </div>
);

const MockContent: ReactNode = (
  <div>
    <p>{mockContentText}</p>
  </div>
);

const MockFooter: ReactNode = (
  <div>
    <p>{mockFooterText}</p>
  </div>
);

const mockOnClose = jest.fn();

const defaultProps: StudioModalProps = {
  onClose: mockOnClose,
  header: MockHeader,
  content: MockContent,
  open: true,
};

describe('StudioModal', () => {
  afterEach(jest.clearAllMocks);

  it('shows the header and content components correctly, and hides the footer when not present', () => {
    render(<StudioModal {...defaultProps} />);

    const header = screen.getByRole('heading', { name: 'Title', level: 3 });
    expect(header).toBeInTheDocument();

    const content = screen.getByText(mockContentText);
    expect(content).toBeInTheDocument();

    const footer = screen.queryByText(mockFooterText);
    expect(footer).not.toBeInTheDocument();
  });

  it('shows the footer component when it is present', () => {
    render(<StudioModal {...defaultProps} footer={MockFooter} />);

    const footer = screen.getByText(mockFooterText);
    expect(footer).toBeInTheDocument();
  });
});
