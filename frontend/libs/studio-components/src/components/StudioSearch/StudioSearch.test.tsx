import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioSearch, type StudioSearchProps } from './StudioSearch';
import userEvent from '@testing-library/user-event';

describe('StudioSearch', () => {
  const defaultProps: StudioSearchProps = {
    label: 'Search',
    onClear: jest.fn(),
    clearButtonLabel: 'Clear search',
  };

  it('renders search input with label', () => {
    renderStudioSearch();
    const searchInput = screen.getByRole('searchbox', { name: 'Search' });
    expect(searchInput).toBeInTheDocument();
  });

  it('calls onClear when clear button is clicked', async () => {
    const user = userEvent.setup();
    const onClear = jest.fn();
    renderStudioSearch({ onClear });
    const clearButton = screen.getByRole('button', { name: 'Clear search' });
    await user.click(clearButton);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  const renderStudioSearch = (props: Partial<StudioSearchProps> = {}): void => {
    const mergedProps = { ...defaultProps, ...props };
    render(<StudioSearch {...mergedProps} />);
  };
});
