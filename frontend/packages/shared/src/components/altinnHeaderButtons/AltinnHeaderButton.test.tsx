import React from 'react';
import { render as rtlRender, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AltinnHeaderButton, AltinnHeaderButtonProps } from './AltinnHeaderButton';
import { textMock } from '../../../../../testing/mocks/i18nMock';

describe('AltinnHeaderbuttons', () => {
  it('should render nothing if action is undefined', () => {
    render({ action: undefined });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('should render the button for the provided action', () => {
    render({
      action: {
        buttonVariant: 'primary',
        headerButtonsClasses: undefined,
        menuKey: 'menu-1',
        title: 'Button1',
        handleClick: jest.fn(),
      },
    });
    expect(screen.getByRole('button', { name: textMock('Button1') })).toBeInTheDocument();
  });

  it('should trigger the handleClick function when a button is clicked', async () => {
    const user = userEvent.setup();

    const handleClick = jest.fn();
    render({
      action: {
        buttonVariant: 'primary',
        headerButtonsClasses: undefined,
        menuKey: 'menu-1',
        title: 'Button1',
        handleClick,
      },
    });

    const button = screen.getByRole('button', { name: textMock('Button1') });
    await act(() => user.click(button));
    await waitFor(() => expect(handleClick).toHaveBeenCalledTimes(1));
  });
});

const render = (props?: Partial<AltinnHeaderButtonProps>) => {
  const defaultProps: AltinnHeaderButtonProps = {
    action: {
      buttonVariant: 'primary',
      headerButtonsClasses: undefined,
      menuKey: 'menu-1',
      title: 'Button1',
      handleClick: jest.fn(),
    },
  };
  rtlRender(<AltinnHeaderButton {...defaultProps} {...props} />, { wrapper: undefined });
};
