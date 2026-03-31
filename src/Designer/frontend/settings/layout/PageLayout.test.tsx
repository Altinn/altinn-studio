import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PageLayout } from './PageLayout';
import { renderWithProviders } from '../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { user as userMock } from 'app-shared/mocks/mocks';
import { DISPLAY_NAME } from 'app-shared/constants';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Outlet: () => <div>Outlet</div>,
}));
jest.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: () => ({ environment: {} }),
}));

const userWithName = { ...userMock, full_name: 'Ola Nordmann' };

const renderPageLayout = () => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.CurrentUser], userWithName);
  return renderWithProviders(<PageLayout />, { queryClient });
};

describe('PageLayout', () => {
  it('renders the app title in the header', () => {
    renderPageLayout();
    expect(screen.getByText(DISPLAY_NAME)).toBeInTheDocument();
  });

  it('renders the Outlet', () => {
    renderPageLayout();
    expect(screen.getByText('Outlet')).toBeInTheDocument();
  });

  it('renders the profile menu trigger with user full name', () => {
    renderPageLayout();
    expect(screen.getByRole('button', { name: userWithName.full_name })).toBeInTheDocument();
  });

  it('renders the profile menu trigger with login when full name is empty', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CurrentUser], {
      ...userMock,
      full_name: '',
      login: 'olanordmann',
    });
    renderWithProviders(<PageLayout />, { queryClient });
    expect(screen.getByRole('button', { name: 'olanordmann' })).toBeInTheDocument();
  });

  it('renders the logout menu item', async () => {
    const user = userEvent.setup();
    renderPageLayout();
    await user.click(screen.getByRole('button', { name: userWithName.full_name }));
    expect(screen.getByText(textMock('shared.header_logout'))).toBeInTheDocument();
  });

  it('does not render the settings menu item when studioOidc is disabled', async () => {
    const user = userEvent.setup();
    renderPageLayout();
    await user.click(screen.getByRole('button', { name: userWithName.full_name }));
    expect(screen.queryByText(textMock('settings'))).not.toBeInTheDocument();
  });

  it('renders the settings menu item when studioOidc is enabled', async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CurrentUser], userWithName);
    jest
      .spyOn(require('app-shared/contexts/EnvironmentConfigContext'), 'useEnvironmentConfig')
      .mockReturnValue({ environment: { featureFlags: { studioOidc: true } } });
    renderWithProviders(<PageLayout />, { queryClient });
    await user.click(screen.getByRole('button', { name: userWithName.full_name }));
    expect(screen.getByText(textMock('settings'))).toBeInTheDocument();
    jest.restoreAllMocks();
  });
});
