import React from 'react';
import { render, screen } from '@testing-library/react';
import { Root } from './Root';
import { useRouterContext } from '../../contexts/RouterContext';
import userEvent from '@testing-library/user-event';

jest.mock('../../contexts/RouterContext', () => ({
  useRouterContext: jest.fn(),
}));

describe('Root Component', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    (useRouterContext as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title and children', () => {
    render(
      <Root title='Welcome'>
        <div>Child Component</div>
      </Root>,
    );
    expect(screen.getByRole('heading', { name: 'Welcome', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Child Component')).toBeInTheDocument();
  });

  it('navigates to codeList when button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <Root title='Welcome'>
        <div>Child Component</div>
      </Root>,
    );

    const button = screen.getByRole('button', { name: /to codelist/i });
    await user.click(button);

    expect(mockNavigate).toHaveBeenCalledWith('codeList');
  });
});
