import type { ReactNode } from 'react';
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { TabPageWrapperProps } from './TabPageWrapper';
import { TabPageWrapper } from './TabPageWrapper';

const mockChildrenText: string = 'Test content';
const mockChildren: ReactNode = <div>{mockChildrenText}</div>;

const defaultProps: TabPageWrapperProps = {
  children: mockChildren,
};

describe('TabPageWrapper', () => {
  it('renders the component correctly with children', () => {
    render(<TabPageWrapper {...defaultProps} />);
    const childElement = screen.getByText(mockChildrenText);
    expect(childElement).toBeInTheDocument();
  });
});
