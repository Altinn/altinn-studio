import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StarButton } from './StarButton';
import { renderWithProviders } from 'app-development/test/testUtils';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { repository } from 'app-shared/mocks/mocks';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';

const mockAppName = 'Test Application';

describe('StarButton', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the star button when repo metadata is available', async () => {
    render(
      {
        getRepoMetadata: jest.fn().mockImplementation(() => Promise.resolve(repository)),
        getStarredRepos: jest.fn().mockImplementation(() => Promise.resolve([])),
      },
      mockAppName,
    );

    expect(await screen.findByRole('button')).toBeInTheDocument();
  });

  it('does not render when repo metadata is not available', async () => {
    render(
      {
        getRepoMetadata: jest.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
        getStarredRepos: jest.fn().mockImplementation(() => Promise.resolve([])),
      },
      mockAppName,
    );

    await waitFor(() => {
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  it('shows unfilled star icon when repo is not starred', async () => {
    render(
      {
        getRepoMetadata: jest.fn().mockImplementation(() => Promise.resolve(repository)),
        getStarredRepos: jest.fn().mockImplementation(() => Promise.resolve([])),
      },
      mockAppName,
    );

    const button = await screen.findByRole('button');
    expect(button).toHaveAttribute('title', textMock('dashboard.star', { appName: mockAppName }));
  });

  it('shows filled star icon when repo is starred', async () => {
    const starredRepo = { ...repository, id: 1 };
    render(
      {
        getRepoMetadata: jest.fn().mockImplementation(() => Promise.resolve(starredRepo)),
        getStarredRepos: jest.fn().mockImplementation(() => Promise.resolve([starredRepo])),
      },
      mockAppName,
    );

    const button = await screen.findByRole('button');
    expect(button).toHaveAttribute(
      'title',
      textMock('dashboard.unstar', { appName: mockAppName }),
    );
  });

  it('calls setStarredRepo mutation when clicking unstarred repo', async () => {
    const user = userEvent.setup();
    const setStarredRepoMock = jest.fn().mockImplementation(() => Promise.resolve());

    render(
      {
        getRepoMetadata: jest.fn().mockImplementation(() => Promise.resolve(repository)),
        getStarredRepos: jest.fn().mockImplementation(() => Promise.resolve([])),
        setStarredRepo: setStarredRepoMock,
      },
      mockAppName,
    );

    const button = await screen.findByRole('button');
    await user.click(button);

    expect(setStarredRepoMock).toHaveBeenCalledWith(repository.owner.login, repository.name);
  });

  it('calls unsetStarredRepo mutation when clicking starred repo', async () => {
    const user = userEvent.setup();
    const unsetStarredRepoMock = jest.fn().mockImplementation(() => Promise.resolve());
    const starredRepo = { ...repository, id: 1 };

    render(
      {
        getRepoMetadata: jest.fn().mockImplementation(() => Promise.resolve(starredRepo)),
        getStarredRepos: jest.fn().mockImplementation(() => Promise.resolve([starredRepo])),
        unsetStarredRepo: unsetStarredRepoMock,
      },
      mockAppName,
    );

    const button = await screen.findByRole('button');
    await user.click(button);

    expect(unsetStarredRepoMock).toHaveBeenCalledWith(starredRepo.owner.login, starredRepo.name);
  });

  it('uses appName prop for tooltip when provided', async () => {
    const customAppName = 'Custom App Name';
    render(
      {
        getRepoMetadata: jest.fn().mockImplementation(() => Promise.resolve(repository)),
        getStarredRepos: jest.fn().mockImplementation(() => Promise.resolve([])),
      },
      customAppName,
    );

    const button = await screen.findByRole('button');
    expect(button).toHaveAttribute('title', textMock('dashboard.star', { appName: customAppName }));
  });

  it('falls back to app param for tooltip when appName is not provided', async () => {
    render(
      {
        getRepoMetadata: jest.fn().mockImplementation(() => Promise.resolve(repository)),
        getStarredRepos: jest.fn().mockImplementation(() => Promise.resolve([])),
      },
      undefined,
    );

    const button = await screen.findByRole('button');
    expect(button).toHaveAttribute('title', textMock('dashboard.star', { appName: app }));
  });
});

const render = (queries = {}, appName?: string) => {
  return renderWithProviders(<StarButton org={org} app={app} appName={appName} />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
    queries: {
      ...queriesMock,
      ...queries,
    },
  });
};
