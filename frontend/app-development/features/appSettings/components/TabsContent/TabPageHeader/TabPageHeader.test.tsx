import React from 'react';
import { render, screen } from '@testing-library/react';
import { TabPageHeader } from './TabPageHeader';

const mockHeadingText: string = 'Test Heading';

describe('TabPageHeader', () => {
  it('renders the component with the provided text', () => {
    render(<TabPageHeader text={mockHeadingText} />);
    expect(screen.getByRole('heading', { name: mockHeadingText, level: 3 })).toBeInTheDocument();
  });
});
