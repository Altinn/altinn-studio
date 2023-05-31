import { versionNameValid } from './utils';
import type { AppRelease } from 'app-shared/types/AppRelease';
import { BuildResult, BuildStatus } from 'app-shared/types/Build';

const releases: AppRelease[] = [
  {
    tagName: 'existing-version-tag',
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    build: {
      id: '123',
      result: BuildResult.succeeded,
      status: BuildStatus.completed,
    },
  },
];

test.each([
  ['anversion name', false],
  ['my-app-v1', true],
  ['my-app.v1', true],
  ['existing-version-tag', false],
])('that %p is validated to: %p', (tagName, expected) => {
  expect(versionNameValid(releases, tagName)).toBe(expected);
});
