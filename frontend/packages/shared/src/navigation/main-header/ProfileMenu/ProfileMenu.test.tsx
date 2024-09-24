import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { IProfileMenuComponentProps } from './ProfileMenu';
import { ProfileMenu } from './ProfileMenu';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';

const user = userEvent.setup();

const render = (props: Partial<IProfileMenuComponentProps> = {}) => {
  const allProps = {
    showlogout: false,
    user: false,
    ...props,
  } as IProfileMenuComponentProps;
  return rtlRender(
    <ServicesContextProvider {...queriesMock} client={createQueryClientMock()}>
      <ProfileMenu {...allProps} />
    </ServicesContextProvider>,
  );
};

// This code will be replaced in issue: #11611 which is being split up into smaller chunks now. Thats why some tests are delted
describe('ProfileMenu', () => {
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
