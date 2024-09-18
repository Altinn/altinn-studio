import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { MemoryRouter } from 'react-router-dom';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { MigrationPanel } from './MigrationPanel';
import type { MigrationPanelProps } from './MigrationPanel';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { ServerCodes } from 'app-shared/enums/ServerCodes';

const defaultProps: MigrationPanelProps = {
  serviceCode: '1',
  serviceEdition: '2',
  env: {
    id: 'tt02',
    label: 'resourceadm.deploy_test_env',
    envType: 'test',
  },
  isMigrationReady: true,
  isPublishedInEnv: true,
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    org: 'ttd',
    resourceId: 'resource1',
  }),
}));

describe('MigrationPanel', () => {
  afterEach(jest.clearAllMocks);

  it('should show warning if resource is not published in environment', () => {
    renderMigrationPanel({ ...defaultProps, isPublishedInEnv: false });
    expect(screen.getByText(textMock('resourceadm.migration_not_published_warning')));
  });

  it('should show error when user gets number of delegations if user has no permission to migrate', async () => {
    const user = userEvent.setup();
    renderMigrationPanel(
      {},
      {
        getAltinn2DelegationsCount: jest.fn().mockImplementation(() => {
          return Promise.reject({ response: { status: ServerCodes.Forbidden } });
        }),
      },
    );

    const getNumberOfDelegationsButton = screen.getByRole('button', {
      name: textMock('resourceadm.migration_get_number_of_delegations'),
    });
    await user.click(getNumberOfDelegationsButton);

    expect(screen.getByText(textMock('resourceadm.migration_no_migration_access')));
  });

  it('should show error when get number of delegations fails', async () => {
    const user = userEvent.setup();
    renderMigrationPanel(
      {},
      {
        getAltinn2DelegationsCount: jest.fn().mockImplementation(() => {
          return Promise.reject({});
        }),
      },
    );

    const getNumberOfDelegationsButton = screen.getByRole('button', {
      name: textMock('resourceadm.migration_get_number_of_delegations'),
    });
    await user.click(getNumberOfDelegationsButton);

    expect(screen.getByText(textMock('resourceadm.migration_get_number_of_delegations_failed')));
  });

  it('Should refetch number of delegations when get delegations button is clicked', async () => {
    const numberOfDelegationsFirstFetch = 200;
    const numberOfDelegationsSecondFetch = 300;
    const user = userEvent.setup();
    renderMigrationPanel(
      {},
      {
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
      },
    );

    const getDelegationsButton = screen.getByRole('button', {
      name: textMock('resourceadm.migration_get_number_of_delegations'),
    });
    await user.click(getDelegationsButton);
    expect(screen.getByText(numberOfDelegationsFirstFetch)).toBeInTheDocument();

    await user.click(getDelegationsButton);
    expect(screen.getByText(numberOfDelegationsSecondFetch)).toBeInTheDocument();
  });

  it('should show error when user starts migrate delegations if user has no permission to migrate', async () => {
    const user = userEvent.setup();
    renderMigrationPanel(
      {},
      {
        migrateDelegations: jest.fn().mockImplementation(() => {
          return Promise.reject({ response: { status: ServerCodes.Forbidden } });
        }),
      },
    );
    const migrationButton = screen.getByRole('button', {
      name: textMock('resourceadm.migration_migrate_delegations', {
        env: textMock(defaultProps.env.label),
      }),
    });
    await user.click(migrationButton);

    expect(screen.getByText(textMock('resourceadm.migration_no_migration_access')));
  });

  it('should show error when migrate delegations fails', async () => {
    const user = userEvent.setup();
    renderMigrationPanel(
      {},
      {
        migrateDelegations: jest.fn().mockImplementation(() => {
          return Promise.reject({});
        }),
      },
    );
    const migrationButton = screen.getByRole('button', {
      name: textMock('resourceadm.migration_migrate_delegations', {
        env: textMock(defaultProps.env.label),
      }),
    });
    await user.click(migrationButton);

    expect(screen.getByText(textMock('resourceadm.migration_post_migration_failed')));
  });

  it('Should show toast when migrate delegations button is clicked', async () => {
    const user = userEvent.setup();
    renderMigrationPanel();

    const dateField = screen.getByLabelText(textMock('resourceadm.migration_migration_date'));
    await user.type(dateField, new Date().toISOString().split('T')[0]);

    const timeField = screen.getByLabelText(textMock('resourceadm.migration_migration_time'));
    await user.type(timeField, '12.00');

    const migrationButton = screen.getByRole('button', {
      name: textMock('resourceadm.migration_migrate_delegations', {
        env: textMock(defaultProps.env.label),
      }),
    });
    await user.click(migrationButton);

    expect(
      screen.getByText(
        textMock('resourceadm.migration_migration_success', {
          env: textMock(defaultProps.env.label),
        }),
      ),
    );
  });
});

const renderMigrationPanel = (
  props: Partial<MigrationPanelProps> = {},
  queries: Partial<ServicesContextProps> = {},
) => {
  const allQueries: Partial<ServicesContextProps> = {
    ...queriesMock,
    ...queries,
  };

  return render(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
        <MigrationPanel {...defaultProps} {...props} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};
