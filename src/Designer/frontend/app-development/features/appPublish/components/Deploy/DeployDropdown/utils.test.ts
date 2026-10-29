import { describe, expect, it, vi } from 'vitest';
import { filterSucceededReleases, mapAppReleasesToImageOptions } from './utils'; // Adjust the import paths as needed
import { BuildResult } from 'app-shared/types/Build';
import type { AppRelease } from 'app-shared/types/AppRelease';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { appRelease } from 'app-shared/mocks/mocks';
import type * as I18next from 'i18next';

const created = '01.01.2024 18:53';
const mockAppReleaseSuccess: AppRelease = {
  ...appRelease,
  tagName: 'test1',
  created,
  build: {
    ...appRelease.build,
    result: BuildResult.succeeded,
  },
};
const mockAppReleaseFailed: AppRelease = {
  ...appRelease,
  tagName: 'test2',
  created,
  build: {
    ...appRelease.build,
    result: BuildResult.failed,
  },
};

const mockAppReleases: AppRelease[] = [mockAppReleaseSuccess, mockAppReleaseFailed];

describe('filterSucceededReleases', () => {
  it('filters out releases with failed build results', () => {
    const result = filterSucceededReleases(mockAppReleases);
    expect(result).toEqual([mockAppReleaseSuccess]);
  });

  it('returns an empty array when no releases have succeeded', () => {
    const result = filterSucceededReleases([mockAppReleaseFailed]);
    expect(result).toEqual([]);
  });

  it('returns all releases if all have succeeded', () => {
    const result = filterSucceededReleases([mockAppReleaseSuccess]);
    expect(result).toEqual([mockAppReleaseSuccess]);
  });

  it('handles an empty array of releases gracefully', () => {
    const result = filterSucceededReleases([]);
    expect(result).toEqual([]);
  });
});

describe('mapAppReleasesToImageOptions', () => {
  it('maps succeeded releases to ImageOption objects', () => {
    const appReleases: AppRelease[] = [mockAppReleaseSuccess];

    const result = mapAppReleasesToImageOptions(appReleases, textMock);
    expect(result).toEqual([
      {
        value: mockAppReleaseSuccess.tagName,
        label: textMock('app_deployment.version_label', {
          tagName: mockAppReleaseSuccess.tagName,
          createdDateTime: created,
        }),
      },
    ]);
  });

  it('includes the branch in the label when the release has one', () => {
    const branch = 'feature/new-page';
    const appReleases: AppRelease[] = [{ ...mockAppReleaseSuccess, branch }];

    const result = mapAppReleasesToImageOptions(appReleases, textMock);
    expect(result).toEqual([
      {
        value: mockAppReleaseSuccess.tagName,
        label: textMock('app_deployment.version_label_with_branch', {
          tagName: mockAppReleaseSuccess.tagName,
          createdDateTime: created,
          branch,
          interpolation: { escapeValue: false },
        }),
      },
    ]);
  });

  it('does not escape the branch name in the label', async () => {
    const { createInstance } = await vi.importActual<typeof I18next>('i18next');
    const i18n = createInstance();
    await i18n.init({
      lng: 'nb',
      resources: {
        nb: { translation: { 'app_deployment.version_label_with_branch': '{{branch}}' } },
      },
    });
    const appReleases: AppRelease[] = [{ ...mockAppReleaseSuccess, branch: 'feature/new-page' }];

    const [option] = mapAppReleasesToImageOptions(appReleases, i18n.t);
    expect(option.label).toBe('feature/new-page');
  });

  it('returns an empty array when no releases are provided', () => {
    const result = mapAppReleasesToImageOptions([], textMock);
    expect(result).toEqual([]);
  });

  it('returns ImageOption objects for multiple releases', () => {
    const newTagName: string = 'test3';
    const appReleases: AppRelease[] = [
      mockAppReleaseSuccess,
      { ...mockAppReleaseSuccess, tagName: newTagName },
    ];

    const result = mapAppReleasesToImageOptions(appReleases, textMock);
    expect(result).toEqual([
      {
        value: mockAppReleaseSuccess.tagName,
        label: textMock('app_deployment.version_label', {
          tagName: mockAppReleaseSuccess.tagName,
          createdDateTime: created,
        }),
      },
      {
        value: newTagName,
        label: textMock('app_deployment.version_label', {
          tagName: newTagName,
          createdDateTime: created,
        }),
      },
    ]);
  });
});
