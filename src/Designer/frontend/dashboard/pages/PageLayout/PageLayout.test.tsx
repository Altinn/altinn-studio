import React from 'react';
import { render } from '@testing-library/react';
import { MockServicesContextWrapper } from '../../dashboardTestUtils';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { organization, user } from 'app-shared/mocks/mocks';
import { PageLayout } from './PageLayout';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { Route, Routes } from 'react-router-dom';
import { Subroute } from '../../enums/Subroute';
import { SelectedContextType } from '../../enums/SelectedContextType';
import { StringUtils } from '@studio/pure-functions';

const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
}));

const renderWithMockServices = (
  selectedContext: string = '',
  services?: Partial<ServicesContextProps>,
) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData(
    [QueryKey.Organizations],
    [
      {
        ...organization,
        username: 'ttd',
      },
    ],
  );
  queryClient.setQueryData([QueryKey.CurrentUser], user);
  const initialEntry = `/${Subroute.AppDashboard}/${selectedContext}`;
  render(
    <MockServicesContextWrapper
      customServices={services}
      client={queryClient}
      initialEntries={[initialEntry]}
    >
      <Routes>
        <Route path='/:subroute/:selectedContext?' element={<PageLayout />} />
      </Routes>
    </MockServicesContextWrapper>,
  );
};

describe('PageLayout', () => {
  afterEach(() => {
    sessionStorage.clear();
    mockedNavigate.mockReset();
  });

  it('should not redirect to root if context is self', async () => {
    renderWithMockServices(SelectedContextType.Self);
    expect(mockedNavigate).not.toHaveBeenCalled();
  });

  it('should not redirect to root if context is all', async () => {
    renderWithMockServices(SelectedContextType.All);
    expect(mockedNavigate).not.toHaveBeenCalled();
  });

  it('should not redirect to root if user have access to selected context', async () => {
    renderWithMockServices('ttd');
    expect(mockedNavigate).not.toHaveBeenCalled();
  });

  it('should redirect to root if user does not have access to selected context', async () => {
    renderWithMockServices('testinvalidcontext');
    expect(mockedNavigate).toHaveBeenCalledTimes(1);
    expect(mockedNavigate).toHaveBeenCalledWith(
      `${StringUtils.removeLeadingSlash(Subroute.AppDashboard)}/${SelectedContextType.Self}`,
      expect.anything(),
    );
  });

  it('should redirect to self context if none is defined', async () => {
    renderWithMockServices();
    expect(mockedNavigate).toHaveBeenCalledTimes(1);
    expect(mockedNavigate).toHaveBeenCalledWith(
      `${StringUtils.removeLeadingSlash(Subroute.AppDashboard)}/${SelectedContextType.Self}`,
      expect.anything(),
    );
  });

  it.each([['self', 'all', 'ttd']])(
    'should redirect to last selected context if none is selected, selected: %s',
    async (context) => {
      sessionStorage.setItem('dashboard::selectedContext', `"${context}"`);
      renderWithMockServices(SelectedContextType.None);
      expect(mockedNavigate).toHaveBeenCalledWith(
        `${StringUtils.removeLeadingSlash(Subroute.AppDashboard)}/${context}`,
        expect.anything(),
      );
    },
  );

  it('should redirect to self if user does not have access to session stored context', async () => {
    sessionStorage.setItem('dashboard::selectedContext', '"testinvalidcontext"');
    renderWithMockServices();
    expect(mockedNavigate).toHaveBeenCalledTimes(1);
    expect(mockedNavigate).toHaveBeenCalledWith(
      `${StringUtils.removeLeadingSlash(Subroute.AppDashboard)}/${SelectedContextType.Self}`,
      expect.anything(),
    );
  });
});
