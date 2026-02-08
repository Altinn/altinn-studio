import React from 'react';
import { useRouteError } from 'react-router-dom';

import { render, screen } from '@testing-library/react';
import { RouterErrorResolver } from 'nextsrc/core/routerErrorResolver';
import { ErrorPage } from 'nextsrc/features/instantiate/pages/error/ErrorPage';

jest.mock('react-router-dom', () => ({
  useRouteError: jest.fn(),
}));

jest.mock('nextsrc/core/routerErrorResolver');

describe('ErrorPage', () => {
  it('should render heading and resolved error message', () => {
    jest.mocked(useRouteError).mockReturnValue(new Error('ignored'));
    jest.spyOn(RouterErrorResolver, 'resolveMessage').mockReturnValue('Something specific went wrong');

    render(<ErrorPage />);

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByText('Something specific went wrong')).toBeInTheDocument();
  });
});
