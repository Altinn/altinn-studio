import React from 'react';
import { render, screen } from '@testing-library/react';
import type { MigrationPageProps } from './MigrationPage';
import { MigrationPage } from './MigrationPage';
import { textMock } from '../../../testing/mocks/i18nMock';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { type ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { MemoryRouter } from 'react-router-dom';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const defaultProps: MigrationPageProps = {
  navigateToPageWithError: jest.fn(),
  id: 'migration_page',
};

describe('MigrationPage', () => {
  it('Should show status alerts for migration ready status', async () => {
    renderMigrationPage();

    await screen.findByText(textMock('resourceadm.migration_ready_for_migration'));
    await screen.findByText(textMock('resourceadm.migration_access_rules_ready_for_migration'));
    await screen.findByText(textMock('resourceadm.migration_publish_warning'));
  });
});

const renderMigrationPage = () => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    getValidatePolicy: jest.fn().mockImplementation(() =>
      Promise.resolve({
        status: 200,
        errors: {},
      }),
    ),
    getValidateResource: jest.fn().mockImplementation(() =>
      Promise.resolve({
        status: 200,
        errors: {},
      }),
    ),
    getResourcePublishStatus: jest.fn().mockImplementation(() =>
      Promise.resolve({
        policyVersion: null,
        resourceVersion: '1',
        publishedVersions: [
          {
            version: null,
            environment: 'at21',
          },
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
  };

  return render(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
        <MigrationPage {...defaultProps} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};
