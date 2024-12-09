import { filterSucceededReleases, mapAppReleasesToImageOptions } from './utils'; // Adjust the import paths as needed
import { BuildResult } from 'app-shared/types/Build';
import type { AppRelease } from 'app-shared/types/AppRelease';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { appRelease } from 'app-shared/mocks/mocks';

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
