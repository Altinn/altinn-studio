import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { AccessListPage } from './AccessListPage';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { MemoryRouter } from 'react-router-dom';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useParams: () => ({
    org: 'org1',
    env: 'tt02',
    accessListId: 'list1',
  }),
}));

describe('AccessListPage', () => {
  afterEach(vi.clearAllMocks);

  it('should show spinner on load', () => {
    renderAccessListPage();
    expect(screen.getByLabelText(textMock('resourceadm.loading_access_list'))).toBeInTheDocument();
  });

  it('should show details page when list is loaded', async () => {
    renderAccessListPage();

    await waitForElementToBeRemoved(() =>
      screen.queryByLabelText(textMock('resourceadm.loading_access_list')),
    );

    expect(
      screen.getByText(textMock('resourceadm.listadmin_list_detail_header')),
    ).toBeInTheDocument();
  });

  it('should show error message is list loading fails', async () => {
    renderAccessListPage(true);

    await waitForElementToBeRemoved(() =>
      screen.queryByLabelText(textMock('resourceadm.loading_access_list')),
    );

    expect(screen.getByText(textMock('resourceadm.listadmin_list_load_error'))).toBeInTheDocument();
  });
});

const renderAccessListPage = (isLoadError?: boolean) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    getAccessList: vi
      .fn()
      .mockImplementation(() => (isLoadError ? Promise.reject({}) : Promise.resolve({}))),
  };
  return render(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
        <AccessListPage />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};
