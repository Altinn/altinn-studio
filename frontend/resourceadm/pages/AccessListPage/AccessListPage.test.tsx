import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { AccessListPage } from './AccessListPage';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { renderWithProviders } from '@studio/testing/wrapper';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    org: 'org1',
    env: 'tt02',
    accessListId: 'list1',
  }),
}));

describe('AccessListPage', () => {
  afterEach(jest.clearAllMocks);

  it('should show spinner on load', () => {
    renderAccessListPage();
    expect(screen.getByText(textMock('resourceadm.loading_access_list'))).toBeInTheDocument();
  });

  it('should show details page when list is loaded', async () => {
    renderAccessListPage();

    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('resourceadm.loading_access_list')),
    );

    expect(
      screen.getByText(textMock('resourceadm.listadmin_list_detail_header')),
    ).toBeInTheDocument();
  });

  it('should show error message is list loading fails', async () => {
    renderAccessListPage(true);

    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('resourceadm.loading_access_list')),
    );

    expect(screen.getByText(textMock('resourceadm.listadmin_list_load_error'))).toBeInTheDocument();
  });
});

const renderAccessListPage = (isLoadError?: boolean) => {
  const queries: Partial<ServicesContextProps> = {
    getAccessList: jest
      .fn()
      .mockImplementation(() => (isLoadError ? Promise.reject({}) : Promise.resolve({}))),
  };
  return renderWithProviders(<AccessListPage />, { queries });
};
