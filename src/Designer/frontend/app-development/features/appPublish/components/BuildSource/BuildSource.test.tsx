import { render, screen } from '@testing-library/react';
import { BuildSource, type BuildSourceProps } from './BuildSource';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { TestAppRouter } from '@studio/testing/testRoutingUtils';
import { app, org } from '@studio/testing/testids';
import { gitCommitPath } from 'app-shared/api/paths';
import type { BranchStatus } from 'app-shared/types/BranchStatus';

const branchName = 'feature/new-page';
const commitId = 'abc123';
const branchStatus: BranchStatus = {
  name: branchName,
  commit: {
    id: commitId,
    message: 'Add new page\n\nWith a longer description',
    timestamp: '2026-02-02T14:30:00Z',
    author: {},
    committer: {},
  },
};

const defaultProps: BuildSourceProps = { branchName, branchStatus };

describe('BuildSource', () => {
  it('renders the branch name', () => {
    renderBuildSource();
    expect(screen.getByText(textMock('app_release.build_source_title'))).toBeInTheDocument();
    expect(screen.getByText(branchName)).toBeInTheDocument();
  });

  it('renders the first line of the latest commit message as a link to the commit', () => {
    renderBuildSource();
    expect(screen.getByRole('link', { name: 'Add new page' })).toHaveAttribute(
      'href',
      gitCommitPath(org, app, commitId),
    );
  });

  it('renders only the branch name when the branch has not been shared', () => {
    renderBuildSource({ branchStatus: undefined });
    expect(screen.getByText(branchName)).toBeInTheDocument();
    expect(
      screen.queryByText(textMock('app_release.build_source_last_shared')),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

const renderBuildSource = (props: Partial<BuildSourceProps> = {}) =>
  render(
    <TestAppRouter>
      <BuildSource {...defaultProps} {...props} />
    </TestAppRouter>,
  );
