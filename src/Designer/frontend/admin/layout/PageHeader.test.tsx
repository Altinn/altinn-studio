import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { PageHeader } from './PageHeader';
import { useMediaQuery } from '@studio/components-legacy';
import type { AltinnStudioEnvironment } from 'app-shared/utils/altinnStudioEnv';

const mockEnvironment: {
  environment: AltinnStudioEnvironment | null;
  isLoading: boolean;
  error: null;
} = { environment: null, isLoading: false, error: null };
const mockLogout = jest.fn();

jest.mock('@studio/components-legacy', () => ({
  ...jest.requireActual('@studio/components-legacy'),
  useMediaQuery: jest.fn(),
}));

jest.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: () => mockEnvironment,
}));

jest.mock('app-shared/hooks/mutations/useLogoutMutation', () => ({
  useLogoutMutation: () => ({ mutate: mockLogout }),
}));

jest.mock('./PageLayout', () => ({
  useCurrentOrg: () => ({
    name: {
      nb: 'Testdepartementet',
      en: 'Test Department',
    },
  }),
  useCurrentUser: () => ({
    avatar_url: '',
    email: 'test@test.no',
    full_name: 'Test Testersen',
    id: 11,
    login: 'test',
    userType: 1,
  }),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ org: 'ttd' }),
}));

describe('PageHeader', () => {
  beforeEach(() => {
    (useMediaQuery as jest.Mock).mockReturnValue(false);
    mockEnvironment.environment = null;
    window.history.pushState({}, '', '/ttd/apps');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('includes the settings link in the profile menu when studioOidc is enabled', async () => {
    const user = userEvent.setup();
    mockEnvironment.environment = { featureFlags: { studioOidc: true } };

    renderPageHeader();

    await user.click(
      screen.getByRole('button', {
        name: textMock('shared.header_user_for_org', {
          user: 'Test Testersen',
          org: 'Testdepartementet',
        }),
      }),
    );

    const settingsLink = screen.getByRole('menuitem', { name: textMock('user.settings') });

    expect(settingsLink).toHaveAttribute('href', '/settings');
    expect(
      screen.getByRole('menuitem', { name: textMock('sync_header.documentation') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitemradio', { name: textMock('shared.header_logout') }),
    ).toBeInTheDocument();
  });

  it('does not include the settings link in the profile menu when studioOidc is disabled', async () => {
    const user = userEvent.setup();
    mockEnvironment.environment = { featureFlags: { studioOidc: false } };

    renderPageHeader();

    await user.click(
      screen.getByRole('button', {
        name: textMock('shared.header_user_for_org', {
          user: 'Test Testersen',
          org: 'Testdepartementet',
        }),
      }),
    );

    expect(
      screen.queryByRole('menuitem', { name: textMock('user.settings') }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: textMock('sync_header.documentation') }),
    ).toBeInTheDocument();
  });
});

const renderPageHeader = () =>
  render(
    <MemoryRouter>
      <PageHeader />
    </MemoryRouter>,
  );
