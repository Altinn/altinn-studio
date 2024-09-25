import React from 'react';
import { render, screen } from '@testing-library/react';
import { CodeList } from './CodeList'; // Adjust the import path as necessary
import { useRouterContext } from '../../contexts/RouterContext';
import userEvent from '@testing-library/user-event';

jest.mock('../../contexts/RouterContext', () => ({
  useRouterContext: jest.fn(),
}));

describe('CodeList Component', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    (useRouterContext as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title correctly', () => {
    render(<CodeList title='Test Title' />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('navigates to root when the button is clicked', async () => {
    const user = userEvent.setup();
    render(<CodeList title='Test Title' />);

    const button = screen.getByRole('button', { name: /lenke/i });
    await user.click(button);

    expect(mockNavigate).toHaveBeenCalledWith('root');
  });
});
