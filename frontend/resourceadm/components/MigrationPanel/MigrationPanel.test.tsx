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
    expect(screen.getByText(textMock('resourceadm.migration_not_published')));
  });

  it('should show message if service has 0 delegations in Altinn 2', async () => {
    renderMigrationPanel(
      {},
      {
        getAltinn2DelegationsCount: jest.fn().mockImplementation(() => {
          return Promise.resolve({ numberOfDelegations: 0 });
        }),
      },
    );
    expect(
      await screen.findByText(textMock('resourceadm.migration_not_needed')),
    ).toBeInTheDocument();
  });

  it('should show message if link service does not exist in given environment', async () => {
    renderMigrationPanel(
      {},
      {
        getAltinn2DelegationsCount: jest.fn().mockImplementation(() => {
          return Promise.reject({ response: { status: ServerCodes.NotFound } });
        }),
      },
    );
    expect(
      await screen.findByText(textMock('resourceadm.migration_service_not_found')),
    ).toBeInTheDocument();
  });

  it('should show message if link service cannot be migrated in given environment', async () => {
    renderMigrationPanel(
      {},
      {
        getAltinn2DelegationsCount: jest.fn().mockImplementation(() => {
          return Promise.reject({ response: { status: ServerCodes.Forbidden } });
        }),
      },
    );
    expect(
      await screen.findByText(textMock('resourceadm.migration_cannot_migrate_in_env')),
    ).toBeInTheDocument();
  });

  it('should show message if get delegation count fails in given environment', async () => {
    renderMigrationPanel(
      {},
      {
        getAltinn2DelegationsCount: jest.fn().mockImplementation(() => {
          return Promise.reject({ response: { status: ServerCodes.InternalServerError } });
        }),
      },
    );

    expect(
      await screen.findByText(textMock('resourceadm.migration_technical_error')),
    ).toBeInTheDocument();
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
      name: textMock('resourceadm.migration_migrate_environment', {
        env: textMock(defaultProps.env.label),
      }),
    });
    await user.click(migrationButton);

    const confirmMigrationCheckbox = screen.getByLabelText(
      textMock('resourceadm.migration_confirm_migration'),
    );
    await user.click(confirmMigrationCheckbox);

    const startMigrationButton = screen.getByText(
      textMock('resourceadm.migration_disable_service_confirm'),
    );
    await user.click(startMigrationButton);

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
      name: textMock('resourceadm.migration_migrate_environment', {
        env: textMock(defaultProps.env.label),
      }),
    });
    await user.click(migrationButton);

    const confirmMigrationCheckbox = screen.getByLabelText(
      textMock('resourceadm.migration_confirm_migration'),
    );
    await user.click(confirmMigrationCheckbox);

    const startMigrationButton = screen.getByText(
      textMock('resourceadm.migration_disable_service_confirm'),
    );
    await user.click(startMigrationButton);

    expect(screen.getByText(textMock('resourceadm.migration_post_migration_failed')));
  });

  it('Should show toast when migrate delegations button is clicked', async () => {
    const user = userEvent.setup();
    renderMigrationPanel();

    const migrationButton = screen.getByRole('button', {
      name: textMock('resourceadm.migration_migrate_environment', {
        env: textMock(defaultProps.env.label),
      }),
    });
    await user.click(migrationButton);

    const confirmMigrationCheckbox = screen.getByLabelText(
      textMock('resourceadm.migration_confirm_migration'),
    );
    await user.click(confirmMigrationCheckbox);

    const startMigrationButton = screen.getByText(
      textMock('resourceadm.migration_disable_service_confirm'),
    );
    await user.click(startMigrationButton);

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
