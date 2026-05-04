import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { ResourceAdmHeader } from './ResourceAdmHeader';
import { FeatureFlag, FeatureFlagsContextProvider } from '@studio/feature-flags';

const mainOrganization = {
  avatar_url: '',
  id: 1,
  username: 'ttd',
  full_name: 'Testdepartementet',
};
const otherOrganization = {
  avatar_url: '',
  id: 2,
  username: 'skd',
  full_name: 'Skatteetaten',
};
const organizations = [mainOrganization, otherOrganization];

const testUser = {
  avatar_url: '',
  email: 'test@test.no',
  full_name: 'Test Testersen',
  id: 11,
  login: 'test',
  userType: 1,
};

const resourceId = 'res-id';

const mockEnvironment: { environment: { featureFlags: { studioOidc: boolean } } | null } = {
  environment: null,
};

jest.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: () => mockEnvironment,
}));

const navigateMock = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => navigateMock,
  useParams: () => ({
    org: mainOrganization.username,
    resourceId: resourceId,
  }),
}));

describe('ResourceAdmHeader', () => {
  beforeEach(() => {
    mockEnvironment.environment = null;
  });

  afterEach(jest.clearAllMocks);

  it('should show org name and resource id in header', () => {
    renderResourceAdmHeader();

    expect(screen.getByText(`${mainOrganization.full_name} / ${resourceId}`)).toBeInTheDocument();
  });

  it('should navigate to new org when another org is chosen in menu', async () => {
    const user = userEvent.setup();
    renderResourceAdmHeader();

    const menuTrigger = screen.getByRole('button', {
      name: textMock('shared.header_user_for_org', {
        user: testUser.full_name,
        org: mainOrganization.full_name,
      }),
    });
    await user.click(menuTrigger);

    const otherOrgButton = screen.getByRole('menuitemradio', {
      name: otherOrganization.full_name,
    });
    await user.click(otherOrgButton);

    expect(navigateMock).toHaveBeenCalled();
  });

  it('should include user settings link in profile menu when studioOidc is enabled', async () => {
    const user = userEvent.setup();
    mockEnvironment.environment = { featureFlags: { studioOidc: true } };

    renderResourceAdmHeader();

    await user.click(
      screen.getByRole('button', {
        name: textMock('shared.header_user_for_org', {
          user: testUser.full_name,
          org: mainOrganization.full_name,
        }),
      }),
    );

    expect(screen.getByRole('menuitem', { name: textMock('settings') })).toBeInTheDocument();
  });

  it('should include user settings link in profile menu when Admin feature flag is enabled', async () => {
    const user = userEvent.setup();
    mockEnvironment.environment = { featureFlags: { studioOidc: false } };

    renderResourceAdmHeader({ featureFlags: [FeatureFlag.Admin] });

    await user.click(
      screen.getByRole('button', {
        name: textMock('shared.header_user_for_org', {
          user: testUser.full_name,
          org: mainOrganization.full_name,
        }),
      }),
    );

    expect(screen.getByRole('menuitem', { name: textMock('settings') })).toBeInTheDocument();
  });

  it('should not include user settings link in profile menu when neither studioOidc nor Admin flag is enabled', async () => {
    const user = userEvent.setup();
    mockEnvironment.environment = { featureFlags: { studioOidc: false } };

    renderResourceAdmHeader();

    await user.click(
      screen.getByRole('button', {
        name: textMock('shared.header_user_for_org', {
          user: testUser.full_name,
          org: mainOrganization.full_name,
        }),
      }),
    );

    expect(screen.queryByRole('menuitem', { name: textMock('settings') })).not.toBeInTheDocument();
  });
});

type RenderOptions = {
  featureFlags?: FeatureFlag[];
};

const renderResourceAdmHeader = ({ featureFlags = [] }: RenderOptions = {}) => {
  return render(
    <MemoryRouter>
      <FeatureFlagsContextProvider value={{ flags: featureFlags }}>
        <ServicesContextProvider {...queriesMock} client={createQueryClientMock()}>
          <ResourceAdmHeader organizations={organizations} user={testUser} />
        </ServicesContextProvider>
      </FeatureFlagsContextProvider>
    </MemoryRouter>,
  );
};
