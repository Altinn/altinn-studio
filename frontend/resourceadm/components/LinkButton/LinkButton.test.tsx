import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LinkButtonProps } from './LinkButton';
import { LinkButton } from './LinkButton';

describe('LinkButton', () => {
  const mockOnClick = jest.fn();

  const defaultProps: LinkButtonProps = {
    page: 'about',
    onClick: mockOnClick,
    children: 'Click Me',
  };

  it('calls onClick function when clicked', async () => {
    const user = userEvent.setup();
    render(<LinkButton {...defaultProps} />);

    const linkButton = screen.getByRole('link', { name: /click me/i });
    await user.click(linkButton);

    expect(mockOnClick).toHaveBeenCalled();
  });
});
