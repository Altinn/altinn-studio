import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { IProfileMenuComponentProps } from './ProfileMenu';
import { ProfileMenu } from './ProfileMenu';
import { textMock } from '../../../../../../testing/mocks/i18nMock';

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
    user: false,
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
      screen.queryByRole('menuitem', { name: textMock('sync_header.documentation') }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: textMock('dashboard.open_repository') }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: textMock('shared.header_logout') }),
    ).not.toBeInTheDocument();

    const profileBtn = screen.getByRole('button', {
      name: textMock('general.profile_icon'),
    });
    expect(profileBtn).toBeInTheDocument();
    await user.click(profileBtn);

    expect(
      screen.getByRole('menuitem', { name: textMock('sync_header.documentation') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: textMock('dashboard.open_repository') }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: textMock('shared.header_logout') }),
    ).not.toBeInTheDocument();
  });

  it('should show menu with link to documentation, logout and open repository when showlogout is true, window object has org and repo properties, and clicking profile button', async () => {
    delete window.location;
    window.location = new URL('https://www.example.com/editor/org/app') as unknown as Location;
    render({ showlogout: true });

    expect(
      screen.queryByRole('link', { name: textMock('sync_header.documentation') }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: textMock('dashboard.open_repository') }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: textMock('shared.header_logout') }),
    ).not.toBeInTheDocument();

    const profileBtn = screen.getByRole('img', { name: textMock('general.profile_icon') });
    await user.click(profileBtn);

    expect(
      screen.getByRole('link', { name: textMock('sync_header.documentation') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: textMock('dashboard.open_repository') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: textMock('shared.header_logout') }),
    ).toBeInTheDocument();
  });
});
