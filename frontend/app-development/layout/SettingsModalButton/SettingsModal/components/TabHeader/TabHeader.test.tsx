import React from 'react';
import { render, screen } from '@testing-library/react';
import type { TabHeaderProps } from './TabHeader';
import { TabHeader } from './TabHeader';

const mockHeadingText: string = 'Test Heading';

describe('TabHeader', () => {
  afterEach(jest.clearAllMocks);

  const defaultProps: TabHeaderProps = {
    text: mockHeadingText,
  };

  it('renders the component with the provided text', () => {
    render(<TabHeader {...defaultProps} />);
    expect(screen.getByText(mockHeadingText)).toBeInTheDocument();
  });
});
