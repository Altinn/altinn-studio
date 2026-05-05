import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProfileMenu, type UserProfileMenuProps } from './UserProfileMenu';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { useMediaQuery } from '@studio/components-legacy';
import { type Repository, type User } from 'app-shared/types/Repository';
import { app, org } from '@studio/testing/testids';
import { repository } from 'app-shared/mocks/mocks';
import { renderWithProviders } from '../../../test/mocks';
import { StudioPageHeaderContextProvider } from '@studio/components/src/components/StudioPageHeader/context';
import { FeatureFlag, FeatureFlagsContextProvider } from '@studio/feature-flags';

const mockEnvironment: { environment: { featureFlags: { studioOidc: boolean } } | null } = {
  environment: null,
};

jest.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: () => mockEnvironment,
}));

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
  beforeEach(() => {
    mockEnvironment.environment = null;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render trigger button text when on a large screen', () => {
    (useMediaQuery as jest.Mock).mockReturnValue(false);

    renderUserProfileMenu();

    expect(
      screen.getByText(
        textMock('shared.header_user_for_org', { user: userMock.full_name, org: '' }),
      ),
    ).toBeInTheDocument();
  });

  it('should not render trigger button text when on a small screen', () => {
    (useMediaQuery as jest.Mock).mockReturnValue(true);

    renderUserProfileMenu();

    expect(
      screen.queryByText(
        textMock('shared.header_user_for_org', { user: userMock.full_name, org: '' }),
      ),
    ).not.toBeInTheDocument();
  });

  it('should render the user avatar with correct alt text', () => {
    renderUserProfileMenu();

    expect(screen.getByAltText(textMock('general.profile_icon'))).toBeInTheDocument();
  });

  it('should include user settings link in profile menu when studioOidc is enabled', async () => {
    const user = userEvent.setup();
    mockEnvironment.environment = { featureFlags: { studioOidc: true } };

    renderUserProfileMenu();

    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('menuitem', { name: textMock('settings') })).toBeInTheDocument();
  });

  it('should include user settings link in profile menu when Admin feature flag is enabled', async () => {
    const user = userEvent.setup();
    mockEnvironment.environment = { featureFlags: { studioOidc: false } };

    renderUserProfileMenu({ flags: [FeatureFlag.Admin] });

    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('menuitem', { name: textMock('settings') })).toBeInTheDocument();
  });

  it('should not include user settings link in profile menu when neither studioOidc nor Admin flag is enabled', async () => {
    const user = userEvent.setup();
    mockEnvironment.environment = { featureFlags: { studioOidc: false } };

    renderUserProfileMenu();

    await user.click(screen.getByRole('button'));

    expect(screen.queryByRole('menuitem', { name: textMock('settings') })).not.toBeInTheDocument();
  });
});

type RenderOptions = {
  props?: Partial<UserProfileMenuProps>;
  flags?: FeatureFlag[];
};

const renderUserProfileMenu = ({ props, flags = [] }: RenderOptions = {}) => {
  return renderWithProviders()(
    <FeatureFlagsContextProvider value={{ flags }}>
      <StudioPageHeaderContextProvider variant='preview'>
        <UserProfileMenu {...defaultProps} {...props} />
      </StudioPageHeaderContextProvider>
    </FeatureFlagsContextProvider>,
  );
};
