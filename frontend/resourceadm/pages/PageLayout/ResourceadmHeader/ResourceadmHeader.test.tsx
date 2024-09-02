import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResourceadmHeader } from './ResourceadmHeader';
import { HeaderContext, SelectedContextType } from 'resourceadm/context/HeaderContext';
import { MemoryRouter, useParams } from 'react-router-dom';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { type User } from 'app-shared/types/Repository';
import { type Organization } from 'app-shared/types/Organization';
import { type HeaderContextType } from 'resourceadm/context/HeaderContext';
import {
  type ServicesContextProps,
  ServicesContextProvider,
  type ServicesContextProviderProps,
} from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock, queryClientConfigMock } from 'app-shared/mocks/queryClientMock';
import { type QueryClient } from '@tanstack/react-query';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: jest.fn(),
}));

const userMock: User = {
  id: 1,
  avatar_url: '',
  email: 'tester@tester.test',
  full_name: 'Tester Testersen',
  login: 'tester',
  userType: 0,
};

const mockOrg1: Organization = {
  avatar_url: '',
  id: 12,
  username: 'ttd',
  full_name: 'Test',
};
const mockOrg2: Organization = {
  avatar_url: '',
  id: 23,
  username: 'unit-test-2',
  full_name: 'unit-test-2',
};
const mockOrganizations: Organization[] = [mockOrg1, mockOrg2];

describe('ResourceadmHeader', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the user name as the profile button when in self context', () => {
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: SelectedContextType.Self,
    });

    renderResourceadmHeader();

    expect(screen.getByRole('button', { name: userMock.full_name })).toBeInTheDocument();
  });

  it('should show the profile menu with all its menuitem when the avatar is clicked', async () => {
    const user = userEvent.setup();
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: SelectedContextType.Self,
    });

    renderResourceadmHeader();

    const avatarButton = screen.getByRole('button', { name: userMock.full_name });
    await user.click(avatarButton);

    const allItem = screen.getByRole('menuitem', { name: textMock('shared.header_all') });
    expect(allItem).toBeInTheDocument();

    const org1Item = screen.getByRole('menuitem', { name: mockOrg1.full_name });
    expect(org1Item).toBeInTheDocument();

    const org2Item = screen.getByRole('menuitem', { name: mockOrg2.full_name });
    expect(org2Item).toBeInTheDocument();

    const userItem = screen.getByRole('menuitem', { name: userMock.full_name });
    expect(userItem).toBeInTheDocument();

    const giteaItem = screen.getByRole('menuitem', { name: textMock('shared.header_go_to_gitea') });
    expect(giteaItem).toBeInTheDocument();

    const logoutItem = screen.getByRole('menuitem', { name: textMock('shared.header_logout') });
    expect(logoutItem).toBeInTheDocument();
  });

  it('should navigate to the correct organization context when an org is selected', async () => {
    const user = userEvent.setup();
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: SelectedContextType.Self,
    });

    renderResourceadmHeader();

    const avatarButton = screen.getByRole('button', { name: userMock.full_name });
    await user.click(avatarButton);

    const org1Item = screen.getByRole('menuitem', { name: mockOrg1.full_name });
    await user.click(org1Item);

    expect(mockNavigate).toHaveBeenCalledWith(`/${mockOrg1.username}`);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });
});

const headerContextValue: HeaderContextType = {
  user: userMock,
  selectableOrgs: mockOrganizations,
};

type Props = {
  customServices?: Partial<ServicesContextProps>;
  client?: QueryClient;
};

const renderResourceadmHeader = ({
  customServices,
  client = createQueryClientMock(),
}: Partial<Props> = {}) => {
  const queries: ServicesContextProviderProps = {
    ...queriesMock,
    ...customServices,
    client,
    clientConfig: queryClientConfigMock,
  };

  return render(
    <MemoryRouter>
      <ServicesContextProvider {...queries}>
        <HeaderContext.Provider value={headerContextValue}>
          <ResourceadmHeader />
        </HeaderContext.Provider>
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};
