import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { org } from '@studio/testing/testids';
import { RepositoryType } from 'app-shared/types/global';
import type { UnsupportedRepositoryPageProps } from './UnsupportedRepositoryPage';
import {
  UnsupportedRepositoryPage,
  isUnsupportedRepositoryType,
} from './UnsupportedRepositoryPage';

const resourcesRepoName = `${org}-resources`;
const contentRepoName = `${org}-content`;

const defaultProps: UnsupportedRepositoryPageProps = {
  org,
  repoName: resourcesRepoName,
  repositoryType: RepositoryType.Resources,
};

describe('UnsupportedRepositoryPage', () => {
  it('should tell the user that the repository is not an app', () => {
    renderUnsupportedRepositoryPage();
    expect(getHeading(resourcesRepoName)).toBeInTheDocument();
  });

  it('should link to the resource dashboard for the resources repository', () => {
    renderUnsupportedRepositoryPage();
    expect(
      screen.getByText(textMock('unsupported_repository_page.resources_description')),
    ).toBeInTheDocument();
    expect(getLink('unsupported_repository_page.go_to_resources')).toHaveAttribute(
      'href',
      `/resourceadm/${org}/${resourcesRepoName}`,
    );
  });

  it('should link to the organization library for the content repository', () => {
    renderUnsupportedRepositoryPage({
      repoName: contentRepoName,
      repositoryType: RepositoryType.OrgLibrary,
    });
    expect(getHeading(contentRepoName)).toBeInTheDocument();
    expect(
      screen.getByText(textMock('unsupported_repository_page.org_library_description')),
    ).toBeInTheDocument();
    expect(getLink('unsupported_repository_page.go_to_org_library')).toHaveAttribute(
      'href',
      `/dashboard/org-library/${org}`,
    );
  });
});

describe('isUnsupportedRepositoryType', () => {
  it.each([RepositoryType.Resources, RepositoryType.OrgLibrary])(
    'should return true for %s',
    (repositoryType) => {
      expect(isUnsupportedRepositoryType(repositoryType)).toBe(true);
    },
  );

  it.each([RepositoryType.App, RepositoryType.DataModels])(
    'should return false for %s',
    (repositoryType) => {
      expect(isUnsupportedRepositoryType(repositoryType)).toBe(false);
    },
  );
});

const getHeading = (repoName: string): HTMLElement =>
  screen.getByRole('heading', {
    level: 1,
    name: textMock('unsupported_repository_page.heading', { repoName }),
  });

const getLink = (textKey: string): HTMLElement =>
  screen.getByRole('link', { name: textMock(textKey) });

function renderUnsupportedRepositoryPage(props: Partial<UnsupportedRepositoryPageProps> = {}) {
  render(<UnsupportedRepositoryPage {...defaultProps} {...props} />);
}
