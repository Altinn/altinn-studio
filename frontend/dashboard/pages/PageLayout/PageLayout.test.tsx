import React from 'react';
import { render } from '@testing-library/react';
import { MockServicesContextWrapper } from '../../dashboardTestUtils';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { organization, user } from 'app-shared/mocks/mocks';
import { PageLayout } from './PageLayout';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { DASHBOARD_ROOT_ROUTE } from 'app-shared/constants';
import { useParams } from 'react-router-dom';
import { SelectedContextType } from 'app-shared/navigation/main-header/Header';

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
  test('should not redirect to root if context is self', async () => {
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: SelectedContextType.Self,
    });
    renderWithMockServices();
    expect(mockedNavigate).not.toHaveBeenCalled();
  });

  test('should not redirect to root if context is all', async () => {
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: SelectedContextType.All,
    });
    renderWithMockServices();
    expect(mockedNavigate).not.toHaveBeenCalled();
  });

  test('should not redirect to root if user have access to selected context', async () => {
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: 'ttd',
    });
    renderWithMockServices();
    expect(mockedNavigate).not.toHaveBeenCalled();
  });

  test('should redirect to root if user does not have access to selected context', async () => {
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: 'test',
    });
    renderWithMockServices();
    expect(mockedNavigate).toHaveBeenCalledTimes(1);
    expect(mockedNavigate).toHaveBeenCalledWith(DASHBOARD_ROOT_ROUTE);
  });
});
