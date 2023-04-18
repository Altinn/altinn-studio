import React from 'react';
import { act, render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { IProfileMenuComponentProps } from './profileMenu';
import { ProfileMenu } from './profileMenu';

const user = userEvent.setup();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
  useParams: () => ({
    org: 'company-id1',
    app: 'app-id1',
  }),
}));

const render = (props: Partial<IProfileMenuComponentProps> = {}) => {
  const allProps = {
    showlogout: false,
    ...props,
  } as IProfileMenuComponentProps;
  return rtlRender(<ProfileMenu {...allProps} />);
};

describe('ProfileMenu', () => {
  it('should match snapshot', () => {
    const { container } = render();
    // eslint-disable-next-line testing-library/no-node-access
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot with logout text', () => {
    const { container } = render({ showlogout: true });
    // eslint-disable-next-line testing-library/no-node-access
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should show menu with link to documentation when clicking profile button', async () => {
    render();

    expect(
      screen.queryByRole('menuitem', { name: /sync_header.decumentation/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: /dashboard.open_repository/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: /shared.header_logout/i })
    ).not.toBeInTheDocument();

    const profileBtn = screen.getByRole('img', { name: /imgIcon/i });
    await act(() => user.click(profileBtn));

    expect(
      screen.getByRole('menuitem', { name: /sync_header.decumentation/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: /dashboard.open_repository/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: /shared.header_logout/i })
    ).not.toBeInTheDocument();
  });

  it('should show menu with link to documentation, logout and open repository when showlogout is true, window object has org and repo properties, and clicking profile button', async () => {
    delete window.location;
    window.location = new URL('https://www.example.com/editor/org/app') as unknown as Location;
    render({ showlogout: true });

    expect(
      screen.queryByRole('link', {
        name: /sync_header.decumentation/i,
      })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', {
        name: /dashboard.open_repository/i,
      })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', {
        name: /shared.header_logout/i,
      })
    ).not.toBeInTheDocument();

    const profileBtn = screen.getByRole('img', {
      name: /imgIcon/i,
    });
    await act(() => user.click(profileBtn));

    expect(
      screen.getByRole('link', {
        name: /sync_header.decumentation/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: /dashboard.open_repository/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', {
        name: /shared.header_logout/i,
      })
    ).toBeInTheDocument();
  });
});
