import React from 'react';
import { StudioPagination, type StudioPaginationProps } from './StudioPagination';
import { render, screen, type RenderResult } from '@testing-library/react';

describe('StudioPagination', () => {
  it('should not render previous button on first page', () => {
    renderStudioPagination();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument();
  });

  it('should not render next button on last page', () => {
    renderStudioPagination({ currentPage: 5 });
    expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  });

  it('should only render max 5 page number buttons', () => {
    renderStudioPagination({ currentPage: 3, totalPages: 10 });
    const pageButtons = screen.getAllByRole('button', { name: /^[0-9]+$/ });
    expect(pageButtons).toHaveLength(5);
  });
});

const renderStudioPagination = (props: Partial<StudioPaginationProps> = {}): RenderResult => {
  const defaultProps: StudioPaginationProps = {
    currentPage: 1,
    totalPages: 5,
    onChange: jest.fn(),
  };
  return render(<StudioPagination {...defaultProps} {...props} />);
};
