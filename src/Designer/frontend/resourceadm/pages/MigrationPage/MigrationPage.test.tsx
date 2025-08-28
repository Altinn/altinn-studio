import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import type { MigrationPageProps } from './MigrationPage';
import { MigrationPage } from './MigrationPage';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { type ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const defaultProps: MigrationPageProps = {
  id: 'migration_page',
  serviceCode: '1',
  serviceEdition: '2',
};

describe('MigrationPage', () => {
  it('Should show status alerts for migration ready status', async () => {
    renderMigrationPage({
      getResourcePublishStatus: jest.fn().mockImplementation(() =>
        Promise.resolve({
          policyVersion: null,
          resourceVersion: '1',
          publishedVersions: [
            {
              version: null,
              environment: 'at22',
            },
            {
              version: null,
              environment: 'at23',
            },
            {
              version: null,
              environment: 'at24',
            },
            {
              version: null,
              environment: 'prod',
            },
            {
              version: null,
              environment: 'tt02',
            },
          ],
        }),
      ),
    });

    await screen.findAllByText(textMock('resourceadm.migration_not_published'));
  });

  it('Should show migrate delegations button when environment is selected', async () => {
    renderMigrationPage({
      getResourcePublishStatus: jest.fn().mockImplementation(() =>
        Promise.resolve({
          policyVersion: null,
          resourceVersion: '2',
          publishedVersions: [
            {
              version: null,
              environment: 'at22',
            },
            {
              version: null,
              environment: 'at23',
            },
            {
              version: null,
              environment: 'at24',
            },
            {
              version: '1',
              environment: 'prod',
            },
            {
              version: '1',
              environment: 'tt02',
            },
          ],
        }),
      ),
    });

    // wait for cards to be shown
    await waitFor(() => {
      expect(screen.getByText(textMock('resourceadm.deploy_test_env'))).toBeInTheDocument();
    });
  });
});

const renderMigrationPage = (queries: Partial<ServicesContextProps> = {}) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
  };

  return render(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} {...queries} client={createQueryClientMock()}>
        <MigrationPage {...defaultProps} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};
