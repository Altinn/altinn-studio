import { render, screen } from '@testing-library/react';
import { Release } from './Release';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { TestAppRouter } from '@studio/testing/testRoutingUtils';
import type { AppRelease } from 'app-shared/types/AppRelease';
import { BuildResult, BuildStatus } from 'app-shared/types/Build';

const release: AppRelease = {
  id: '1',
  tagName: 'v1',
  name: 'v1',
  body: 'First release',
  app: 'app',
  org: 'org',
  targetCommitish: 'abc123',
  createdBy: 'user',
  created: '2026-02-02T14:30:00Z',
  build: {
    id: '1',
    status: BuildStatus.completed,
    result: BuildResult.succeeded,
    started: '2026-02-02T14:30:00Z',
    finished: '2026-02-02T14:35:00Z',
  },
};

describe('Release', () => {
  it('renders the branch the release was built from', () => {
    const branch = 'feature/new-page';
    renderRelease({ ...release, branch });
    expect(
      screen.getByText(`${textMock('app_release.release_branch')} ${branch}`),
    ).toBeInTheDocument();
  });

  it('does not render a branch for releases without branch information', () => {
    renderRelease(release);
    expect(
      screen.queryByText(textMock('app_release.release_branch'), { exact: false }),
    ).not.toBeInTheDocument();
  });
});

const renderRelease = (appRelease: AppRelease) =>
  render(
    <TestAppRouter>
      <Release release={appRelease} />
    </TestAppRouter>,
  );
