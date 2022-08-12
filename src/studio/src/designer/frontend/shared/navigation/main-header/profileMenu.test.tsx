import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileMenuComponent from './profileMenu';
import type { IProfileMenuComponentProps } from './profileMenu';
import { IAltinnWindow } from 'app-shared/types/global';

const user = userEvent.setup();

describe('ProfileMenu', () => {
  it('should match snapshot', () => {
    const { container } = render();
    expect(container.firstChild).toMatchSnapshot;
  });

  it('should match snapshot with logout text', () => {
    const { container } = render({ showlogout: true });
    expect(container.firstChild).toMatchSnapshot;
  });

  it('should show menu with link to documentation when clicking profile button', async () => {
    render();

    expect(
      screen.queryByRole('link', {
        name: /dokumentasjon/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', {
        name: /åpne repository/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', {
        name: /logout/i,
      }),
    ).not.toBeInTheDocument();

    const profileBtn = screen.getByRole('button', {
      name: /profilikon knapp/i,
    });
    await user.click(profileBtn);

    expect(
      screen.getByRole('link', {
        name: /dokumentasjon/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', {
        name: /åpne repository/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', {
        name: /logout/i,
      }),
    ).not.toBeInTheDocument();
  });

  it('should show menu with link to documentation, logout and open repository when showlogout is true, window object has org and repo properties, and clicking profile button', async () => {
    const altinnWindow = window as Window as IAltinnWindow;
    altinnWindow.org = 'org';
    altinnWindow.app = 'app';
    render({ showlogout: true });

    expect(
      screen.queryByRole('link', {
        name: /dokumentasjon/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', {
        name: /åpne repository/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', {
        name: /logout/i,
      }),
    ).not.toBeInTheDocument();

    const profileBtn = screen.getByRole('button', {
      name: /profilikon knapp/i,
    });
    await user.click(profileBtn);

    expect(
      screen.getByRole('link', {
        name: /dokumentasjon/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: /åpne repository/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', {
        name: /logout/i,
      }),
    ).toBeInTheDocument();
  });
});

const render = (props: Partial<IProfileMenuComponentProps> = {}) => {
  const allProps = {
    showlogout: false,
    ...props,
  } as IProfileMenuComponentProps;

  return rtlRender(<ProfileMenuComponent {...allProps} />);
};
