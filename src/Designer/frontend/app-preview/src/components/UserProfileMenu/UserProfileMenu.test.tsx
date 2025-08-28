import React from 'react';
import { screen } from '@testing-library/react';
import { UserProfileMenu, type UserProfileMenuProps } from './UserProfileMenu';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { useMediaQuery } from '@studio/components-legacy';
import { type Repository, type User } from 'app-shared/types/Repository';
import { app, org } from '@studio/testing/testids';
import { repository } from 'app-shared/mocks/mocks';
import { renderWithProviders } from '../../../test/mocks';

jest.mock('@studio/components-legacy/src/hooks/useMediaQuery');

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

const defaultProps: UserProfileMenuProps = {
  user: userMock,
  repository: repositoryMock,
};

describe('UserProfileMenu', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render trigger button text when on a large screen', () => {
    (useMediaQuery as jest.Mock).mockReturnValue(false);

    renderUserProfileMenu();

    expect(
      screen.getByTitle(
        textMock('shared.header_user_for_org', { user: userMock.full_name, org: '' }),
      ),
    ).toBeInTheDocument();
  });

  it('should not render trigger button text when on a small screen', () => {
    (useMediaQuery as jest.Mock).mockReturnValue(true);

    renderUserProfileMenu();

    expect(
      screen.queryByTitle(
        textMock('shared.header_user_for_org', { user: userMock.full_name, org: '' }),
      ),
    ).not.toBeInTheDocument();
  });

  it('should render the user avatar with correct alt text', () => {
    renderUserProfileMenu();

    expect(screen.getByAltText(textMock('general.profile_icon'))).toBeInTheDocument();
  });
});

const renderUserProfileMenu = (props?: Partial<UserProfileMenuProps>) => {
  return renderWithProviders()(<UserProfileMenu {...defaultProps} {...props} />);
};
