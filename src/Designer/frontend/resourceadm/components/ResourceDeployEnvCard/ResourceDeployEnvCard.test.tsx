import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { ResourceDeployEnvCardProps } from './ResourceDeployEnvCard';
import { ResourceDeployEnvCard } from './ResourceDeployEnvCard';
import { textMock } from '@designer/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { QueryClient } from '@tanstack/react-query';
import type { EnvId } from '../../utils/resourceUtils';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';

const mockTestEnv: EnvId = 'tt02';
const mockTestEnvLabel: string = 'resourceadm.deploy_test_env';
const mockCurrentEnvVersion: string = '1';
const mockNewEnvVersion: string = '2';

const defaultProps: ResourceDeployEnvCardProps = {
  isDeployPossible: true,
  env: mockTestEnv,
  currentEnvVersion: mockCurrentEnvVersion,
  newEnvVersion: mockNewEnvVersion,
};

describe('ResourceDeployEnvCard', () => {
  it('displays a toast when deploy is successful', async () => {
    const user = userEvent.setup();
    renderResourceDeployEnvCard();
    const deployButton = screen.getByRole('button', {
      name: textMock('resourceadm.deploy_card_publish', { env: textMock(mockTestEnvLabel) }),
    });

    await user.click(deployButton);
    await waitFor(() => {
      expect(
        screen.getByText(
          textMock('resourceadm.resource_published_success', {
            envName: textMock(mockTestEnvLabel),
          }),
        ),
      ).toBeInTheDocument();
    });
  });

  it('renders the environment name', () => {
    renderResourceDeployEnvCard();
    const envName = screen.getByText(textMock(mockTestEnvLabel));
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
      textMock('resourceadm.deploy_card_arrow_icon', { env: textMock(mockTestEnvLabel) }),
    );

    expect(newVersion).toBeInTheDocument();
    expect(arrowIcon).toBeInTheDocument();
  });

  it('disables the button when deploy is not possible', () => {
    renderResourceDeployEnvCard({ isDeployPossible: false });
    const deployButton = screen.getByRole('button', {
      name: textMock('resourceadm.deploy_card_publish', { env: textMock(mockTestEnvLabel) }),
    });
    expect(deployButton).toBeDisabled();
  });

  it('calls "handlePublish" when publishing a resource', async () => {
    const user = userEvent.setup();
    renderResourceDeployEnvCard();

    const deployButton = screen.getByRole('button', {
      name: textMock('resourceadm.deploy_card_publish', { env: textMock(mockTestEnvLabel) }),
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
        publishResource: vi
          .fn()
          .mockImplementation(() => Promise.reject({ response: { status: 403 } })),
      },
    );

    const deployButton = screen.getByRole('button', {
      name: textMock('resourceadm.deploy_card_publish', { env: textMock(mockTestEnvLabel) }),
    });

    await user.click(deployButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          textMock('resourceadm.resource_publish_no_access', {
            envName: textMock(mockTestEnvLabel),
          }),
        ),
      ).toBeInTheDocument();
    });
  });

  it('should show conflict error if publish fails with error 409', async () => {
    const user = userEvent.setup();
    renderResourceDeployEnvCard(
      {},
      { publishResource: vi.fn().mockRejectedValue({ response: { status: 409 } }) },
    );

    await user.click(getDeployButton());

    expect(
      await screen.findByText(
        textMock('resourceadm.resource_publish_conflict', {
          envName: textMock(mockTestEnvLabel),
        }),
      ),
    ).toBeInTheDocument();
  });

  it('should show title and detail from the response if publish fails with another error', async () => {
    const user = userEvent.setup();
    const title = 'Invalid resource';
    const detail = 'The resource is missing a Maskinporten scope';
    renderResourceDeployEnvCard(
      {},
      {
        publishResource: vi
          .fn()
          .mockRejectedValue({ response: { status: 400, data: { title, detail } } }),
      },
    );

    await user.click(getDeployButton());

    expect(await screen.findByText(title)).toBeInTheDocument();
    expect(screen.getByText(detail)).toBeInTheDocument();
  });

  it('should show generic error with status code if the response has no detail', async () => {
    const user = userEvent.setup();
    renderResourceDeployEnvCard(
      {},
      { publishResource: vi.fn().mockRejectedValue({ response: { status: 502 } }) },
    );

    await user.click(getDeployButton());

    expect(
      await screen.findByText(textMock('resourceadm.resource_publish_error', { statusCode: 502 })),
    ).toBeInTheDocument();
  });

  it('should show generic error with status code 500 if the error has no response', async () => {
    const user = userEvent.setup();
    renderResourceDeployEnvCard(
      {},
      { publishResource: vi.fn().mockRejectedValue(new Error('Network error')) },
    );

    await user.click(getDeployButton());

    expect(
      await screen.findByText(textMock('resourceadm.resource_publish_error', { statusCode: 500 })),
    ).toBeInTheDocument();
  });

  it('should allow retry and clear the error when publish fails', async () => {
    const user = userEvent.setup();
    const publishResource = vi
      .fn()
      .mockRejectedValueOnce({ response: { status: 403 } })
      .mockResolvedValueOnce(undefined);
    renderResourceDeployEnvCard({}, { publishResource });
    const noAccessText = textMock('resourceadm.resource_publish_no_access', {
      envName: textMock(mockTestEnvLabel),
    });

    await user.click(getDeployButton());
    expect(await screen.findByText(noAccessText)).toBeInTheDocument();
    expect(getDeployButton()).toBeEnabled();

    await user.click(getDeployButton());

    await waitFor(() => expect(screen.queryByText(noAccessText)).not.toBeInTheDocument());
    expect(publishResource).toHaveBeenCalledTimes(2);
  });
});

const getDeployButton = (): HTMLButtonElement =>
  screen.getByRole('button', {
    name: textMock('resourceadm.deploy_card_publish', { env: textMock(mockTestEnvLabel) }),
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
