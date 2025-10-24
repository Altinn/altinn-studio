import React from 'react';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../test/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import { branchStatus } from 'app-shared/mocks/mocks';
import type { BranchStatus } from 'app-shared/types/BranchStatus';
import { NavigateToLatestCommitInGitea } from './NavigateToLatestCommitInGitea';

describe('NavigateToLatestCommitInGitea', () => {
  afterEach(() => jest.clearAllMocks);

  it('sets window location when the latest commit is received', async () => {
    const commitId = 'some-commit-id';
    delete window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, assign: jest.fn() },
    });
    renderLatestCommit({ ...branchStatus, commit: { ...branchStatus.commit, id: commitId } });
    expect(window.location.href).toBe(`/repos/${org}/${app}/commit/${commitId}`);
  });

  it('renders a spinner if master branch status is pending', () => {
    renderLatestCommit();
    expect(screen.getByLabelText(textMock('general.loading'))).toBeInTheDocument();
  });
});

const renderLatestCommit = (branchStatusMock?: BranchStatus) => {
  const queryClientMock = createQueryClientMock();
  if (branchStatusMock) {
    queryClientMock.setQueryData([QueryKey.BranchStatus, org, app, 'master'], branchStatusMock);
  }
  renderWithProviders({}, queryClientMock)(<NavigateToLatestCommitInGitea />);
};
