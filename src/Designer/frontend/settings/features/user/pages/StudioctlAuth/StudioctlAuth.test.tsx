import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { StudioctlAuth } from './StudioctlAuth';
import { renderWithProviders } from '../../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { User } from 'app-shared/types/Repository';
import type {
  StudioctlAuthCallback,
  StudioctlAuthRequest,
} from 'app-shared/types/api/StudioctlAuth';

const originalWindowLocation = window.location;

const mockEnvironment: { environment: { featureFlags: { studioOidc: boolean } } | null } = {
  environment: { featureFlags: { studioOidc: true } },
};

jest.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: () => mockEnvironment,
}));

const owner = 'test-user';
const requestId = 'request-id';
const callbackUrl = 'http://127.0.0.1:12345/callback?code=code&state=state';
const currentUser: User = {
  avatar_url: '',
  email: '',
  full_name: '',
  id: 1,
  login: owner,
  userType: 0,
};
const authRequest: StudioctlAuthRequest = {
  username: owner,
  clientName: 'studioctl dev',
  tokenName: 'studioctl dev abc123',
  expiresAt: '2099-01-01T00:00:00Z',
};
const callback: StudioctlAuthCallback = { callbackUrl };

const renderStudioctlAuth = (queries: Parameters<typeof renderWithProviders>[1]['queries'] = {}) =>
  renderWithProviders(
    <Routes>
      <Route path='/:owner/studioctl-auth' element={<StudioctlAuth />} />
    </Routes>,
    {
      initialEntries: [`/${owner}/studioctl-auth?requestId=${requestId}`],
      queries: {
        getUser: jest.fn().mockImplementation(() => Promise.resolve(currentUser)),
        getStudioctlAuthRequest: jest.fn().mockImplementation(() => Promise.resolve(authRequest)),
        ...queries,
      },
    },
  );

describe('StudioctlAuth', () => {
  beforeEach(() => {
    mockEnvironment.environment = { featureFlags: { studioOidc: true } };
    delete window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalWindowLocation,
        assign: jest.fn(),
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalWindowLocation,
    });
  });

  it('renders the authorization details', async () => {
    renderStudioctlAuth();

    expect(
      await screen.findByRole('heading', { name: textMock('settings.studioctl_auth.heading') }),
    ).toBeInTheDocument();
    expect(screen.getByText(authRequest.clientName)).toBeInTheDocument();
    expect(screen.getByText(authRequest.tokenName)).toBeInTheDocument();
    expect(
      screen.getByText(textMock('settings.studioctl_auth.permission_repos')),
    ).toBeInTheDocument();
  });

  it('confirms and redirects to the callback URL', async () => {
    const user = userEvent.setup();
    const confirmStudioctlAuthRequest = jest
      .fn()
      .mockImplementation(() => Promise.resolve(callback));
    renderStudioctlAuth({ confirmStudioctlAuthRequest });

    await user.click(
      await screen.findByRole('button', { name: textMock('settings.studioctl_auth.confirm') }),
    );

    await waitFor(() => expect(confirmStudioctlAuthRequest).toHaveBeenCalledWith(requestId));
    expect(window.location.assign).toHaveBeenCalledWith(callbackUrl);
  });

  it('cancels and redirects to the callback URL', async () => {
    const user = userEvent.setup();
    const cancelStudioctlAuthRequest = jest
      .fn()
      .mockImplementation(() => Promise.resolve(callback));
    renderStudioctlAuth({ cancelStudioctlAuthRequest });

    await user.click(
      await screen.findByRole('button', { name: textMock('settings.studioctl_auth.cancel') }),
    );

    await waitFor(() => expect(cancelStudioctlAuthRequest).toHaveBeenCalledWith(requestId));
    expect(window.location.assign).toHaveBeenCalledWith(callbackUrl);
  });

  it('renders not found when studio OIDC is disabled', async () => {
    mockEnvironment.environment = { featureFlags: { studioOidc: false } };
    renderStudioctlAuth();

    expect(
      await screen.findByRole('heading', { name: textMock('not_found_page.heading') }),
    ).toBeInTheDocument();
  });
});
