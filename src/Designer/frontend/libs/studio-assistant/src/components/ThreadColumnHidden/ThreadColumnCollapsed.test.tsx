import React from 'react';
import { ThreadColumnCollapsed } from './ThreadColumnCollapsed';
import { render, screen } from '@testing-library/react';
import type { ThreadColumnHiddenProps } from './ThreadColumnCollapsed';
import userEvent from '@testing-library/user-event';

// Test data
const onToggleCollapse = jest.fn();

describe('ThreadColumnCollapsed', () => {
  it('should render the toggle button', () => {
    renderThreadColumnCollapsed();
    const toggleButton = screen.getAllByRole('button')[0];

    expect(toggleButton).toBeInTheDocument();
  });

  it('should render the new thread button', () => {
    renderThreadColumnCollapsed();
    const buttons = screen.getAllByRole('button');

    expect(buttons).toHaveLength(2);
  });

  it('should call onToggleCollapse when toggle button is clicked', async () => {
    const user = userEvent.setup();
    renderThreadColumnCollapsed();
    const toggleButton = screen.getAllByRole('button')[0];

    await user.click(toggleButton);

    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
  });
});

const defaultProps: ThreadColumnHiddenProps = {
  onToggleCollapse: onToggleCollapse,
};

const renderThreadColumnCollapsed = (props?: Partial<ThreadColumnHiddenProps>): void => {
  render(<ThreadColumnCollapsed {...defaultProps} {...props} />);
};
