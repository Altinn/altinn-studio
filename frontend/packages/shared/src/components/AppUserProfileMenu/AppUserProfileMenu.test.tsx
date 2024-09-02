import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppUserProfileMenu, type AppUserProfileMenuProps } from './AppUserProfileMenu';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { type StudioProfileMenuItem, useMediaQuery } from '@studio/components';
import { type Repository, type User } from 'app-shared/types/Repository';
import { app, org } from '@studio/testing/testids';
import { repository } from 'app-shared/mocks/mocks';

jest.mock('@studio/components/src/hooks/useMediaQuery');

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    org,
    app,
  }),
}));

const userMock: User = {
  id: 1,
  avatar_url: 'url',
  email: 'tester@tester.test',
  full_name: 'Tester Testersen',
  login: 'tester',
  userType: 0,
};

const repositoryMock: Repository = {
  ...repository,
  name: 'test-repo',
  full_name: 'org/test-repo',
};

const profileMenuItemsMock: StudioProfileMenuItem[] = [
  {
    action: { type: 'button', onClick: jest.fn() },
    itemName: 'Menu Item 1',
  },
  {
    action: { type: 'link', href: '/link' },
    itemName: 'Menu Item 2',
  },
];

const defaultProps: AppUserProfileMenuProps = {
  user: userMock,
  repository: repositoryMock,
  color: 'dark',
  variant: 'regular',
  profileMenuItems: profileMenuItemsMock,
};

describe('AppUserProfileMenu', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render trigger button text when on a large screen', () => {
    (useMediaQuery as jest.Mock).mockReturnValue(false);

    renderAppUserProfileMenu();

    expect(
      screen.getByText(
        textMock('shared.header_user_for_org', { user: userMock.full_name, org: '' }),
      ),
    ).toBeInTheDocument();
  });

  it('should not render trigger button text when on a small screen', () => {
    (useMediaQuery as jest.Mock).mockReturnValue(true);

    renderAppUserProfileMenu();

    expect(
      screen.queryByText(
        textMock('shared.header_user_for_org', { user: userMock.full_name, org: '' }),
      ),
    ).not.toBeInTheDocument();
  });

  it('should render the user avatar with correct alt text', () => {
    renderAppUserProfileMenu();

    expect(screen.getByAltText(textMock('general.profile_icon'))).toBeInTheDocument();
  });
});

const renderAppUserProfileMenu = (props?: Partial<AppUserProfileMenuProps>) => {
  return render(<AppUserProfileMenu {...defaultProps} {...props} />);
};
