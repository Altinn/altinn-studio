import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { ResourceDeployEnvCardProps } from './ResourceDeployEnvCard';
import { ResourceDeployEnvCard } from './ResourceDeployEnvCard';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { QueryClient } from '@tanstack/react-query';
import type { Environment } from '../../utils/resourceUtils';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';

const mockTestEnv: Environment = {
  envType: 'test',
  id: 'tt02',
  label: 'tt02_label',
};
const mockCurrentEnvVersion: string = '1';
const mockNewEnvVersion: string = '2';

const defaultProps: ResourceDeployEnvCardProps = {
  isDeployPossible: true,
  env: mockTestEnv,
  currentEnvVersion: mockCurrentEnvVersion,
  newEnvVersion: mockNewEnvVersion,
};

describe('ResourceDeployEnvCard', () => {
  afterEach(jest.clearAllMocks);

  it('displays a toast when deploy is successful', async () => {
    const user = userEvent.setup();
    renderResourceDeployEnvCard();
    const deployButton = screen.getByRole('button', {
      name: textMock('resourceadm.deploy_card_publish', { env: textMock(mockTestEnv.label) }),
    });

    await user.click(deployButton);
    await waitFor(() => {
      expect(
        screen.getByText(
          textMock('resourceadm.resource_published_success', {
            envName: textMock(mockTestEnv.label),
          }),
        ),
      ).toBeInTheDocument();
    });
  });

  it('renders the environment name', () => {
    renderResourceDeployEnvCard();
    const envName = screen.getByText(textMock(mockTestEnv.label));
    expect(envName).toBeInTheDocument();
  });

  it('renders the current environment version', () => {
    renderResourceDeployEnvCard();
    const currentVersion = screen.getByText(mockCurrentEnvVersion);
    expect(currentVersion).toBeInTheDocument();
  });

  it('renders the new environment version and arrow icon if new version exists', () => {
    renderResourceDeployEnvCard();
    const newVersion = screen.getByText(mockNewEnvVersion);
    const arrowIcon = screen.getByTitle(
      textMock('resourceadm.deploy_card_arrow_icon', { env: textMock(mockTestEnv.label) }),
    );

    expect(newVersion).toBeInTheDocument();
    expect(arrowIcon).toBeInTheDocument();
  });

  it('disables the button when deploy is not possible', () => {
    renderResourceDeployEnvCard({ isDeployPossible: false });
    const deployButton = screen.getByRole('button', {
      name: textMock('resourceadm.deploy_card_publish', { env: textMock(mockTestEnv.label) }),
    });
    expect(deployButton).toBeDisabled();
  });

  it('calls "handlePublish" when publishing a resource', async () => {
    const user = userEvent.setup();
    renderResourceDeployEnvCard();

    const deployButton = screen.getByRole('button', {
      name: textMock('resourceadm.deploy_card_publish', { env: textMock(mockTestEnv.label) }),
    });

    expect(deployButton).not.toBeDisabled();

    await user.click(deployButton);
    expect(queriesMock.publishResource).toHaveBeenCalledTimes(1);
  });

  it('should show error if publish fails with error 403', async () => {
    const user = userEvent.setup();
    renderResourceDeployEnvCard(
      {},
      {
        publishResource: jest
          .fn()
          .mockImplementation(() => Promise.reject({ response: { status: 403 } })),
      },
    );

    const deployButton = screen.getByRole('button', {
      name: textMock('resourceadm.deploy_card_publish', { env: textMock(mockTestEnv.label) }),
    });

    await user.click(deployButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          textMock('resourceadm.resource_publish_no_access', {
            envName: textMock(mockTestEnv.label),
          }),
        ),
      ).toBeInTheDocument();
    });
  });
});

const renderResourceDeployEnvCard = (
  props: Partial<ResourceDeployEnvCardProps> = {},
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };

  return render(
    <ServicesContextProvider {...allQueries} client={queryClient}>
      <ResourceDeployEnvCard {...defaultProps} {...props} />
    </ServicesContextProvider>,
  );
};
