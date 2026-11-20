import {
  getFrontendVersionFromUrl,
  getUrlWithFrontendVersion,
} from 'src/features/devtools/components/VersionSwitcher/versionSwitcherUtils';

describe('getFrontendVersionFromUrl', () => {
  it('reads the version from the address', () => {
    expect(getFrontendVersionFromUrl('http://local.altinn.cloud/ttd/app/?frontendVersion=9.0.0-preview.10')).toBe(
      '9.0.0-preview.10',
    );
  });

  it('uses the first value when the parameter is there more than once, like the backend', () => {
    expect(
      getFrontendVersionFromUrl('http://local.altinn.cloud/ttd/app/?frontendVersion=9.0.0&frontendVersion=9.0.1'),
    ).toBe('9.0.0');
  });

  it('returns an empty string without the parameter', () => {
    expect(getFrontendVersionFromUrl('http://local.altinn.cloud/ttd/app/')).toBe('');
  });
});

describe('getUrlWithFrontendVersion', () => {
  it('sets the version and keeps the path, other parameters and hash', () => {
    expect(
      getUrlWithFrontendVersion('http://local.altinn.cloud/ttd/app/instance/1/abc/Task_1/Side1?lang=en#x', '9.0.0'),
    ).toBe('http://local.altinn.cloud/ttd/app/instance/1/abc/Task_1/Side1?lang=en&frontendVersion=9.0.0#x');
  });

  it('replaces a version that is already in the address', () => {
    expect(getUrlWithFrontendVersion('http://local.altinn.cloud/ttd/app/?frontendVersion=9.0.0', '9.0.1')).toBe(
      'http://local.altinn.cloud/ttd/app/?frontendVersion=9.0.1',
    );
  });
});
