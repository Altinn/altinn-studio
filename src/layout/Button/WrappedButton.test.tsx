import React from 'react';

import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { WrappedButton } from 'src/layout/Button/WrappedButton';

const buttonText = 'the button';

describe('WrappedButton', () => {
  it('should show loading indicator ', async () => {
    const func = jest.fn();
    render({ onClick: func, busyWithId: 'some-id' });
    expect(screen.getByRole('button', { name: /the button general\.loading/i })).toBeInTheDocument();
    expect(screen.getByText('general.loading')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /the button general\.loading/i }));
    expect(func).not.toHaveBeenCalled();
  });
  it('should show not show loading indicator, but cant be clicked ', async () => {
    const func = jest.fn();
    render({ onClick: func, busyWithId: 'some-other-id' });
    expect(screen.getByRole('button', { name: /the button/i })).toBeInTheDocument();
    expect(screen.queryByText('general.loading')).toBeNull();
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
  rtlRender(
    <WrappedButton
      onClick={onClick}
      busyWithId={busyWithId}
      id={'some-id'}
      disabled={false}
      language={{}}
    >
      {buttonText}
    </WrappedButton>,
  );
};
