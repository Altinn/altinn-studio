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
  navigateToPageWithError: jest.fn(),
  id: 'migration_page',
  serviceCode: '1',
  serviceEdition: '2',
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

  it('Should show error message for resource data and policy data when resource is not ready to be migrated', async () => {
    renderMigrationPage({
      getValidatePolicy: jest.fn().mockImplementation(() =>
        Promise.resolve({
          status: 404,
          errors: {},
        }),
      ),
      getValidateResource: jest.fn().mockImplementation(() =>
        Promise.resolve({
          status: 400,
          errors: {},
        }),
      ),
    });

    await screen.findByText(textMock('resourceadm.migration_step_about_resource_errors'));
    await screen.findByText(textMock('resourceadm.migration_no_access_rules'));
  });

  it('Should show migrate delegations button when environment is selected', async () => {
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

    // wait for accordions to be shown
    await waitFor(() => {
      expect(screen.getByText(textMock('resourceadm.deploy_test_env'))).toBeInTheDocument();
    });
  });

  it('Should refetch number of delegations when get delegations button is clicked', async () => {
    const numberOfDelegationsFirstFetch = 200;
    const numberOfDelegationsSecondFetch = 300;
    const user = userEvent.setup();
    renderMigrationPage({
      getResourcePublishStatus: jest.fn().mockImplementation(() =>
        Promise.resolve({
          policyVersion: null,
          resourceVersion: '2',
          publishedVersions: [
            {
              version: '1',
              environment: 'tt02',
            },
          ],
        }),
      ),
      getAltinn2DelegationsCount: jest
        .fn()
        .mockImplementationOnce(() =>
          Promise.resolve({
            numberOfDelegations: numberOfDelegationsFirstFetch,
            numberOfRelations: 500,
          }),
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            numberOfDelegations: numberOfDelegationsSecondFetch,
            numberOfRelations: 500,
          }),
        ),
    });

    // wait for radio buttons to be shown
    await waitFor(() => {
      expect(screen.getByLabelText(textMock('resourceadm.deploy_test_env'))).toBeInTheDocument();
    });
    const tt02Radio = screen.getByLabelText(textMock('resourceadm.deploy_test_env'));
    await user.click(tt02Radio);

    const getDelegationsButton = screen.getByRole('button', {
      name: textMock('resourceadm.migration_get_number_of_delegations'),
    });
    await user.click(getDelegationsButton);
    expect(screen.getByText(numberOfDelegationsFirstFetch)).toBeInTheDocument();

    await user.click(getDelegationsButton);
    expect(screen.getByText(numberOfDelegationsSecondFetch)).toBeInTheDocument();
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
