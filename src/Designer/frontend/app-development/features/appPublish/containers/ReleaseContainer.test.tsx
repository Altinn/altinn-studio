import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { ReleaseContainer } from './ReleaseContainer';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import {
  type ServicesContextProps,
  ServicesContextProvider,
} from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { repoStatus } from 'app-shared/mocks/mocks';
import userEvent from '@testing-library/user-event';
import { BuildResult, BuildStatus } from 'app-shared/types/Build';
import { FeatureFlagsContextProvider } from '@studio/feature-flags';
import type { OrgList } from 'app-shared/types/OrgList';
import { TestAppRouter } from '@studio/testing/testRoutingUtils';
import { ApiErrorCodes } from 'app-shared/enums/ApiErrorCodes';

const renderReleaseContainer = (queries?: Partial<ServicesContextProps>) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };

  render(
    <FeatureFlagsContextProvider value={{ flags: [] }}>
      <TestAppRouter>
        <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
          <ReleaseContainer />
        </ServicesContextProvider>
      </TestAppRouter>
    </FeatureFlagsContextProvider>,
  );
};

describe('ReleaseContainer', () => {
  afterEach(() => jest.clearAllMocks());
  it('renders the component with a spinner', () => {
    renderReleaseContainer();
    expect(screen.getByText(textMock('app_release.release_tab_versions'))).toBeInTheDocument();
    expect(screen.getByText(textMock('app_create_release.check_status'))).toBeInTheDocument();

    const spinner = screen.getByText(textMock('app_create_release.loading'));
    expect(spinner).toBeInTheDocument();

    expect(screen.getByText(textMock('app_release.earlier_releases'))).toBeInTheDocument();
  });

  it('renders an option to build release if master branch commit differs from latest release commit', async () => {
    const user = userEvent.setup();
    const mockGetRepoStatus = jest.fn().mockImplementation(() => Promise.resolve(repoStatus));
    const mockGetBranchStatus = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ commit: { id: '123' } }));
    renderReleaseContainer({
      getRepoStatus: mockGetRepoStatus,
      getBranchStatus: mockGetBranchStatus,
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('app_create_release.loading')),
    );

    const statusButton = screen.getByRole('button', {
      name: textMock('app_create_release.status_popover'),
    });
    await user.click(statusButton);
    expect(screen.getByText(textMock('app_create_release.ok'))).toBeInTheDocument();
    expect(screen.getByText(textMock('app_release.release_title'))).toBeInTheDocument();
    expect(screen.getByText(textMock('app_release.release_title_link'))).toBeInTheDocument();
    expect(mockGetBranchStatus).toHaveBeenCalledTimes(1);
  });

  it('calls getBranchRepoStatus again to refetch if clicking "latest commit fetched from master"', async () => {
    jest.spyOn(window, 'open').mockImplementation(jest.fn());
    const user = userEvent.setup();
    const mockGetRepoStatus = jest.fn().mockImplementation(() => Promise.resolve(repoStatus));
    const mockGetBranchStatus = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ commit: { id: '123' } }));
    renderReleaseContainer({
      getRepoStatus: mockGetRepoStatus,
      getBranchStatus: mockGetBranchStatus,
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('app_create_release.loading')),
    );

    const latestCommitLink = screen.getByRole('link', {
      name: textMock('app_release.release_title_link'),
    });
    await user.click(latestCommitLink);
    expect(mockGetRepoStatus).toHaveBeenCalledTimes(1);
    expect(latestCommitLink).toBeInTheDocument();
  });

  it('renders status that latest commit fetched from master is the same as commit for latest release', async () => {
    const user = userEvent.setup();
    const mockLatestCommit = '123';
    const mockTagName = 'v1';
    const mockGetRepoStatus = jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve({ ...repoStatus, contentStatus: [{ filePath: '', fileStatus: '' }] }),
      );
    const mockGetBranchStatus = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ commit: { id: mockLatestCommit } }));
    const mockGetAppReleases = jest.fn().mockImplementation(() =>
      Promise.resolve({
        results: [
          {
            targetCommitish: mockLatestCommit,
            tagName: mockTagName,
            build: { result: BuildResult.succeeded, status: BuildStatus.completed },
          },
        ],
      }),
    );
    renderReleaseContainer({
      getRepoStatus: mockGetRepoStatus,
      getBranchStatus: mockGetBranchStatus,
      getAppReleases: mockGetAppReleases,
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('app_create_release.loading')),
    );

    const statusButton = screen.getByRole('button', {
      name: textMock('app_create_release.status_popover'),
    });
    await user.click(statusButton);
    expect(
      screen.getByText(textMock('app_create_release.local_changes_cant_build')),
    ).toBeInTheDocument();
    expect(
      screen.getByText(textMock('app_release.release_built_on_version', { version: mockTagName })),
    ).toBeInTheDocument();
    expect(
      screen.getByText(textMock('app_create_release.no_changes_on_current_release')),
    ).toBeInTheDocument();
    const latestCommitLink = screen.getByRole('link', {
      name: textMock('app_release.release_built_on_version_link'),
    });
    expect(latestCommitLink).toBeInTheDocument();
  });

  it('renders an option to build release if Maskinporten scopes differ from latest release', async () => {
    const mockLatestCommit = '123';
    const mockTagName = 'v1';
    const mockGetRepoStatus = jest.fn().mockImplementation(() => Promise.resolve(repoStatus));
    const mockGetBranchStatus = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ commit: { id: mockLatestCommit } }));
    const mockGetAppReleases = jest.fn().mockImplementation(() =>
      Promise.resolve({
        results: [
          {
            targetCommitish: mockLatestCommit,
            tagName: mockTagName,
            buildInputs: { maskinportenScopes: ['altinn:serviceowner'] },
            build: { result: BuildResult.succeeded, status: BuildStatus.completed },
          },
        ],
      }),
    );
    const mockGetSelectedMaskinportenScopes = jest.fn().mockImplementation(() =>
      Promise.resolve({
        scopes: [
          {
            scope: 'altinn:serviceowner',
            description: 'Brukes til å indikere at klienten er et tjenesteeiersystem.',
          },
          {
            scope: 'altinn:serviceowner/instances.read',
            description: 'Klienter kan lese data knyttet til alle appene til tjenesteeieren.',
          },
        ],
      }),
    );

    renderReleaseContainer({
      getRepoStatus: mockGetRepoStatus,
      getBranchStatus: mockGetBranchStatus,
      getAppReleases: mockGetAppReleases,
      getOrgList: jest.fn().mockImplementation(() => Promise.resolve(orgListWithTestOrg)),
      getSelectedMaskinportenScopes: mockGetSelectedMaskinportenScopes,
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('app_create_release.loading')),
    );

    expect(mockGetSelectedMaskinportenScopes).toHaveBeenCalled();
    expect(screen.getByText(textMock('app_release.release_title'))).toBeInTheDocument();
    expect(
      screen.getByLabelText(textMock('app_create_release.release_version_number')),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(textMock('app_create_release.no_changes_on_current_release')),
    ).not.toBeInTheDocument();
  });

  it('renders an option to build release if latest release was built before Maskinporten scopes were stored', async () => {
    const mockLatestCommit = '123';
    const mockGetRepoStatus = jest.fn().mockImplementation(() => Promise.resolve(repoStatus));
    const mockGetBranchStatus = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ commit: { id: mockLatestCommit } }));
    const mockGetAppReleases = jest.fn().mockImplementation(() =>
      Promise.resolve({
        results: [
          {
            targetCommitish: mockLatestCommit,
            tagName: 'v1',
            build: { result: BuildResult.succeeded, status: BuildStatus.completed },
          },
        ],
      }),
    );
    const mockGetSelectedMaskinportenScopes = jest.fn().mockImplementation(() =>
      Promise.resolve({
        scopes: [
          {
            scope: 'altinn:serviceowner',
            description: 'Brukes til å indikere at klienten er et tjenesteeiersystem.',
          },
        ],
      }),
    );

    renderReleaseContainer({
      getRepoStatus: mockGetRepoStatus,
      getBranchStatus: mockGetBranchStatus,
      getAppReleases: mockGetAppReleases,
      getOrgList: jest.fn().mockImplementation(() => Promise.resolve(orgListWithTestOrg)),
      getSelectedMaskinportenScopes: mockGetSelectedMaskinportenScopes,
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('app_create_release.loading')),
    );

    expect(screen.getByText(textMock('app_release.release_title'))).toBeInTheDocument();
    expect(
      screen.getByLabelText(textMock('app_create_release.release_version_number')),
    ).toBeInTheDocument();
  });

  it('does not query Maskinporten scopes for apps outside service owner organisations', async () => {
    const mockLatestCommit = '123';
    const mockTagName = 'v1';
    const mockGetRepoStatus = jest.fn().mockImplementation(() => Promise.resolve(repoStatus));
    const mockGetBranchStatus = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ commit: { id: mockLatestCommit } }));
    const mockGetAppReleases = jest.fn().mockImplementation(() =>
      Promise.resolve({
        results: [
          {
            targetCommitish: mockLatestCommit,
            tagName: mockTagName,
            build: { result: BuildResult.succeeded, status: BuildStatus.completed },
          },
        ],
      }),
    );
    const mockGetSelectedMaskinportenScopes = jest.fn();

    renderReleaseContainer({
      getRepoStatus: mockGetRepoStatus,
      getBranchStatus: mockGetBranchStatus,
      getAppReleases: mockGetAppReleases,
      getOrgList: jest.fn().mockImplementation(() => Promise.resolve({ orgs: {} })),
      getSelectedMaskinportenScopes: mockGetSelectedMaskinportenScopes,
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('app_create_release.loading')),
    );

    expect(mockGetSelectedMaskinportenScopes).not.toHaveBeenCalled();
    expect(
      screen.getByText(textMock('app_release.release_built_on_version', { version: mockTagName })),
    ).toBeInTheDocument();
    expect(
      screen.getByText(textMock('app_create_release.no_changes_on_current_release')),
    ).toBeInTheDocument();
  });

  it('renders status that there local changes that will not be included in build if not pushed', async () => {
    const user = userEvent.setup();
    const mockGetRepoStatus = jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve({ ...repoStatus, contentStatus: [{ filePath: '', fileStatus: '' }] }),
      );
    const mockGetBranchStatus = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ commit: { id: '123' } }));
    const mockGetAppReleases = jest.fn().mockImplementation(() =>
      Promise.resolve({
        results: [
          {
            targetCommitish: '122',
            tagName: 'v1',
            build: { result: BuildResult.succeeded },
          },
        ],
      }),
    );
    renderReleaseContainer({
      getRepoStatus: mockGetRepoStatus,
      getBranchStatus: mockGetBranchStatus,
      getAppReleases: mockGetAppReleases,
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('app_create_release.loading')),
    );

    const statusButton = screen.getByRole('button', {
      name: textMock('app_create_release.status_popover'),
    });
    await user.click(statusButton);
    expect(
      screen.getByText(textMock('app_create_release.local_changes_can_build')),
    ).toBeInTheDocument();
  });

  it('renders still-building message when latest release is in progress on master commit', async () => {
    const mockLatestCommit = '123';
    const mockGetRepoStatus = jest.fn().mockImplementation(() => Promise.resolve(repoStatus));
    const mockGetBranchStatus = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ commit: { id: mockLatestCommit } }));
    const mockGetAppReleases = jest.fn().mockImplementation(() =>
      Promise.resolve({
        results: [
          {
            targetCommitish: mockLatestCommit,
            tagName: 'v1',
            build: { status: BuildStatus.inProgress, result: BuildResult.none },
          },
        ],
      }),
    );
    renderReleaseContainer({
      getRepoStatus: mockGetRepoStatus,
      getBranchStatus: mockGetBranchStatus,
      getAppReleases: mockGetAppReleases,
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          textMock('app_create_release.still_building_release', { version: mockLatestCommit }),
        ),
      ).toBeInTheDocument();
    });
  });

  it('renders popover (not StudioError) when master branch query fails with an unrecognised error', async () => {
    const mockGetBranchStatus = jest.fn().mockRejectedValue({
      response: { data: { errorCode: 'GT_UnknownError' } },
    });
    renderReleaseContainer({ getBranchStatus: mockGetBranchStatus });

    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('app_create_release.loading')),
    );

    expect(
      screen.getByRole('button', { name: textMock('app_create_release.status_popover') }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders a StudioError when master branch is not found', async () => {
    const mockGetBranchStatus = jest.fn().mockRejectedValue({
      response: { data: { errorCode: ApiErrorCodes.BranchNotFound } },
    });
    renderReleaseContainer({ getBranchStatus: mockGetBranchStatus });

    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('app_create_release.loading')),
    );

    expect(
      screen.getByText(textMock('api_errors.' + ApiErrorCodes.BranchNotFound)),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: textMock('app_create_release.status_popover') }),
    ).not.toBeInTheDocument();
  });
});

const orgListWithTestOrg: OrgList = {
  orgs: {
    testOrg: {
      name: { nb: 'Testdepartementet' },
      logo: '',
      orgnr: '123456789',
      homepage: '',
      environments: [],
    },
  },
};
