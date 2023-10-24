import React from 'react';

import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { WrappedButton } from 'src/layout/Button/WrappedButton';
import { renderWithProviders } from 'src/test/renderWithProviders';

const buttonText = 'the button';

describe('WrappedButton', () => {
  it('should show loading indicator ', async () => {
    const func = jest.fn();
    render({ onClick: func, busyWithId: 'some-id' });
    expect(screen.getByRole('button', { name: /the button/i })).toBeInTheDocument();
    expect(screen.getByText('Laster innhold')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /the button/i }));
    expect(func).not.toHaveBeenCalled();
  });
  it('should show not show loading indicator, but cant be clicked ', async () => {
    const func = jest.fn();
    render({ onClick: func, busyWithId: 'some-other-id' });
    expect(screen.getByRole('button', { name: /the button/i })).toBeInTheDocument();
    expect(screen.queryByText('Laster innhold')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /the button/i }));
    expect(func).not.toHaveBeenCalled();
  });
  it('should be possible to click if nothing is loading', async () => {
    const func = jest.fn();
    render({ onClick: func, busyWithId: '' });
    await userEvent.click(screen.getByRole('button', { name: /the button/i }));
    expect(func).toHaveBeenCalled();
  });
});

const render = ({ onClick, busyWithId = '' }) => {
  renderWithProviders(
    <WrappedButton
      onClick={onClick}
      busyWithId={busyWithId}
      id={'some-id'}
      disabled={false}
    >
      {buttonText}
    </WrappedButton>,
  );
};
