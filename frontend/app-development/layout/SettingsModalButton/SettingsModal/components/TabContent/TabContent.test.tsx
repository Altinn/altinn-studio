import React, { type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { TabContent, type TabContentProps } from './TabContent';

const mockChildrenText: string = 'Test content';
const mockChildren: ReactNode = <div>{mockChildrenText}</div>;

const defaultProps: TabContentProps = {
  children: mockChildren,
};

describe('TabContent', () => {
  it('renders the component correctly with children', () => {
    render(<TabContent {...defaultProps} />);
    const childElement = screen.getByText(mockChildrenText);
    expect(childElement).toBeInTheDocument();
  });
});
