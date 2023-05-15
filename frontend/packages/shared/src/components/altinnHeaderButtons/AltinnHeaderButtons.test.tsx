import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import { AltinnHeaderButtons, AltinnHeaderButtonsProps } from './AltinnHeaderButtons';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { ButtonVariant } from '@digdir/design-system-react';

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
    const pathFunc = (org: string, app: string) => `${org}-${app}-path`;
    render({
      actions: [
        {
          buttonVariant: ButtonVariant.Filled,
          headerButtonsClasses: undefined,
          menuKey: 'menu-1',
          path: pathFunc,
          title: textMock('Button1'),
        },
        {
          buttonVariant: ButtonVariant.Filled,
          headerButtonsClasses: undefined,
          menuKey: 'menu-2',
          path: pathFunc,
          title: textMock('Button2'),
        },
      ],
    });
    expect(screen.queryAllByRole('button')).toHaveLength(2);
  });
});

const render = (props?: Partial<AltinnHeaderButtonsProps>) => {
  const defaultProps: AltinnHeaderButtonsProps = {
    actions: [],
  };
  rtlRender(<AltinnHeaderButtons {...defaultProps} {...props} />, { wrapper: undefined });
};
