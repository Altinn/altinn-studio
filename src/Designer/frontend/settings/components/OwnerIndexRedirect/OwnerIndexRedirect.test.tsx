import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { OwnerIndexRedirect } from './OwnerIndexRedirect';
import { renderWithProviders } from '../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { user as userMock } from 'app-shared/mocks/mocks';
import { RoutePaths as UserRoutePaths } from '../../features/user/routes/RoutePaths';
import { RoutePaths as OrgRoutePaths } from '../../features/orgs/routes/RoutePaths';
const userWithLogin = { ...userMock, login: 'testuser' };

const mockEnvironment: { environment: { featureFlags: { studioOidc: boolean } } | null } = {
  environment: null,
};
jest.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: () => mockEnvironment,
}));
jest.mock('../NoOrgSelected/NoOrgSelected', () => ({
  NoOrgSelected: () => <div data-testid='no-org-selected' />,
}));
jest.mock('../NotFound/NotFound', () => ({
  NotFound: () => <div data-testid='not-found' />,
}));

const mockUseFeatureFlag = jest.fn();
jest.mock('@studio/feature-flags', () => ({
  ...jest.requireActual('@studio/feature-flags'),
  useFeatureFlag: () => mockUseFeatureFlag(),
}));

const RoutedOwnerIndexRedirect = () => (
  <Routes>
    <Route path='/:owner' element={<OwnerIndexRedirect />} />
    <Route path={`/:owner/${UserRoutePaths.ApiKeys}`} element={<div>User page</div>} />
    <Route path={`/:owner/${OrgRoutePaths.BotAccounts}`} element={<div>Bot accounts page</div>} />
    <Route
      path={`/:owner/${OrgRoutePaths.ContactPoints}`}
      element={<div>Contact points page</div>}
    />
  </Routes>
);

const renderOwnerIndexRedirect = (initialPath: string, seedUser = true) => {
  const queryClient = createQueryClientMock();
  if (seedUser) {
    queryClient.setQueryData([QueryKey.CurrentUser], userWithLogin);
  }
  return renderWithProviders(<RoutedOwnerIndexRedirect />, {
    queryClient,
    initialEntries: [initialPath],
  });
};

describe('OwnerIndexRedirect', () => {
  beforeEach(() => {
    mockEnvironment.environment = { featureFlags: { studioOidc: true } };
    mockUseFeatureFlag.mockReturnValue(false);
  });

  afterEach(() => jest.clearAllMocks());

  it('redirects to the api-keys page when owner matches the logged-in user and studioOidc is enabled', () => {
    renderOwnerIndexRedirect('/testuser');
    expect(screen.getByText('User page')).toBeInTheDocument();
  });

  it('renders the no-org-selected message when owner matches the logged-in user and studioOidc is disabled', () => {
    mockEnvironment.environment = { featureFlags: { studioOidc: false } };
    mockUseFeatureFlag.mockReturnValue(true);
    renderOwnerIndexRedirect('/testuser');
    expect(screen.getByTestId('no-org-selected')).toBeInTheDocument();
  });

  it('redirects to the bot-accounts page when owner is an org and studioOidc is enabled', () => {
    renderOwnerIndexRedirect('/ttd');
    expect(screen.getByText('Bot accounts page')).toBeInTheDocument();
  });

  it('redirects to the contact-points page when owner is an org and studioOidc is disabled', () => {
    mockEnvironment.environment = { featureFlags: { studioOidc: false } };
    mockUseFeatureFlag.mockReturnValue(true);
    renderOwnerIndexRedirect('/ttd');
    expect(screen.getByText('Contact points page')).toBeInTheDocument();
  });

  it('renders a not-found page when neither studioOidc nor Admin flag is enabled', () => {
    mockEnvironment.environment = { featureFlags: { studioOidc: false } };
    mockUseFeatureFlag.mockReturnValue(false);
    renderOwnerIndexRedirect('/ttd');
    expect(screen.getByTestId('not-found')).toBeInTheDocument();
  });

  it('renders nothing when user data is not yet available', () => {
    renderOwnerIndexRedirect('/ttd', false);
    expect(screen.queryByText('User page')).not.toBeInTheDocument();
    expect(screen.queryByText('Bot accounts page')).not.toBeInTheDocument();
    expect(screen.queryByText('Contact points page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('no-org-selected')).not.toBeInTheDocument();
    expect(screen.queryByTestId('not-found')).not.toBeInTheDocument();
  });
});
