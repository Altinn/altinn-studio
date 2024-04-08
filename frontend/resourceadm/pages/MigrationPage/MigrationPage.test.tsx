import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import type { MigrationPageProps } from './MigrationPage';
import { MigrationPage } from './MigrationPage';
import { textMock } from '../../../testing/mocks/i18nMock';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { type ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const defaultProps: MigrationPageProps = {
  navigateToPageWithError: jest.fn(),
  id: 'migration_page',
};

describe('MigrationPage', () => {
  it('Should show status alerts for migration ready status', async () => {
    renderMigrationPage({
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
    });

    await screen.findByText(textMock('resourceadm.migration_ready_for_migration'));
    await screen.findByText(textMock('resourceadm.migration_access_rules_ready_for_migration'));
    await screen.findByText(textMock('resourceadm.migration_publish_warning'));
  });

  it('Should show migrate delegations button when environment is selected', async () => {
    const user = userEvent.setup();
    renderMigrationPage({
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
          resourceVersion: '2',
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

    // wait for radio buttons to be shown
    await waitFor(() => {
      expect(screen.getByLabelText(textMock('resourceadm.deploy_test_env'))).toBeInTheDocument();
    });
    const tt02Radio = screen.getByLabelText(textMock('resourceadm.deploy_test_env'));
    await act(() => user.click(tt02Radio));

    expect(
      screen.getByText(textMock('resourceadm.migration_migrate_delegations')),
    ).toBeInTheDocument();
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
