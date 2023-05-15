import React from 'react';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AltinnHeaderButtons, AltinnHeaderButtonsProps } from './AltinnHeaderButtons';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { ButtonVariant } from '@digdir/design-system-react';

const user = userEvent.setup();

describe('AltinnHeaderbuttons', () => {
  it('should render no buttons if empty list of actions is passed', () => {
    render();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('should render no buttons if no actions object is passed', () => {
    render({ actions: undefined });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('should render buttons for the provided actions', () => {
    render({
      actions: [
        {
          buttonVariant: ButtonVariant.Filled,
          headerButtonsClasses: undefined,
          menuKey: 'menu-1',
          title: 'Button1',
          handleClick: jest.fn(),
        },
        {
          buttonVariant: ButtonVariant.Filled,
          headerButtonsClasses: undefined,
          menuKey: 'menu-2',
          title: 'Button2',
          handleClick: jest.fn(),
        },
      ],
    });
    expect(screen.queryAllByRole('button')).toHaveLength(2);
  });

  it('should trigger the handleClick function when a button is clicked', async () => {
    const handleClick = jest.fn();
    render({
      actions: [
        {
          buttonVariant: ButtonVariant.Filled,
          headerButtonsClasses: undefined,
          menuKey: 'menu-1',
          title: 'Button1',
          handleClick,
        },
      ],
    });

    const button = screen.getByRole('button', { name: textMock('Button1') });
    user.click(button);
    await waitFor(() => expect(handleClick).toHaveBeenCalledTimes(1));
  });
});

const render = (props?: Partial<AltinnHeaderButtonsProps>) => {
  const defaultProps: AltinnHeaderButtonsProps = {
    actions: [],
  };
  rtlRender(<AltinnHeaderButtons {...defaultProps} {...props} />, { wrapper: undefined });
};
