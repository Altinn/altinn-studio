import React from 'react';
import { render } from '@testing-library/react';
import { MockServicesContextWrapper } from '../../dashboardTestUtils';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { organization, user } from 'app-shared/mocks/mocks';
import { PageLayout } from './PageLayout';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useParams } from 'react-router-dom';
import { Subroute } from '../../enums/Subroute';
import { SelectedContextType } from '../../enums/SelectedContextType';
import { StringUtils } from 'libs/studio-pure-functions/src';

const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
  useParams: jest.fn(),
}));

const renderWithMockServices = (services?: Partial<ServicesContextProps>) => {
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

  render(
    <MockServicesContextWrapper customServices={services} client={queryClient}>
      <PageLayout />
    </MockServicesContextWrapper>,
  );
};

describe('PageLayout', () => {
  afterEach(() => {
    sessionStorage.clear();
    mockedNavigate.mockReset();
  });

  it('should not redirect to root if context is self', async () => {
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: SelectedContextType.Self,
    });
    renderWithMockServices();
    expect(mockedNavigate).not.toHaveBeenCalled();
  });

  it('should not redirect to root if context is all', async () => {
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: SelectedContextType.All,
    });
    renderWithMockServices();
    expect(mockedNavigate).not.toHaveBeenCalled();
  });

  it('should not redirect to root if user have access to selected context', async () => {
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: 'ttd',
    });
    renderWithMockServices();
    expect(mockedNavigate).not.toHaveBeenCalled();
  });

  it('should redirect to root if user does not have access to selected context', async () => {
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: 'testinvalidcontext',
    });
    renderWithMockServices();
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
      (useParams as jest.Mock).mockReturnValue({
        selectedContext: SelectedContextType.None,
      });
      sessionStorage.setItem('dashboard::selectedContext', `"${context}"`);
      renderWithMockServices();
      expect(mockedNavigate).toHaveBeenCalledWith(
        `${StringUtils.removeLeadingSlash(Subroute.AppDashboard)}/${context}`,
        expect.anything(),
      );
    },
  );

  it('should redirect to self if user does not have access to session stored context', async () => {
    (useParams as jest.Mock).mockReturnValue({});
    sessionStorage.setItem('dashboard::selectedContext', '"testinvalidcontext"');
    renderWithMockServices();
    expect(mockedNavigate).toHaveBeenCalledTimes(1);
    expect(mockedNavigate).toHaveBeenCalledWith(
      `${StringUtils.removeLeadingSlash(Subroute.AppDashboard)}/${SelectedContextType.Self}`,
      expect.anything(),
    );
  });
});
