import React from 'react';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AltinnHeaderButton, AltinnHeaderButtonProps } from './AltinnHeaderButton';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { ButtonVariant } from '@digdir/design-system-react';

const user = userEvent.setup();

describe('AltinnHeaderbuttons', () => {
  it('should render nothing if action is undefined', () => {
    render({ action: undefined });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('should render the button for the provided action', () => {
    render({
      action: {
        buttonVariant: ButtonVariant.Filled,
        headerButtonsClasses: undefined,
        menuKey: 'menu-1',
        title: 'Button1',
        handleClick: jest.fn(),
      },
    });
    expect(screen.getByRole('button', { name: textMock('Button1') })).toBeInTheDocument();
  });

  it('should trigger the handleClick function when a button is clicked', async () => {
    const handleClick = jest.fn();
    render({
      action: {
        buttonVariant: ButtonVariant.Filled,
        headerButtonsClasses: undefined,
        menuKey: 'menu-1',
        title: 'Button1',
        handleClick,
      },
    });

    const button = screen.getByRole('button', { name: textMock('Button1') });
    user.click(button);
    await waitFor(() => expect(handleClick).toHaveBeenCalledTimes(1));
  });

  it('should render information icon if action is in beta', () => {
    render({
      action: {
        buttonVariant: ButtonVariant.Filled,
        headerButtonsClasses: undefined,
        menuKey: 'menu-1',
        title: 'Button1',
        handleClick: jest.fn(),
        inBeta: true,
      },
    });
    expect(screen.getByRole('img', { name: 'information' })).toBeInTheDocument();
  });

  it('should render popover with beta message when hovering over information icon', async () => {
    render({
      action: {
        buttonVariant: ButtonVariant.Filled,
        headerButtonsClasses: undefined,
        menuKey: 'menu-1',
        title: 'Button1',
        handleClick: jest.fn(),
        inBeta: true,
      },
    });
    const button = screen.getByRole('img', { name: 'information' });
    user.hover(button);

    await screen.findByText(textMock('top_menu.preview_is_beta_message'));
  });
});

const render = (props?: Partial<AltinnHeaderButtonProps>) => {
  const defaultProps: AltinnHeaderButtonProps = {
    action: {
      buttonVariant: ButtonVariant.Filled,
      headerButtonsClasses: undefined,
      menuKey: 'menu-1',
      title: 'Button1',
      handleClick: jest.fn(),
    },
  };
  rtlRender(<AltinnHeaderButton {...defaultProps} {...props} />, { wrapper: undefined });
};
