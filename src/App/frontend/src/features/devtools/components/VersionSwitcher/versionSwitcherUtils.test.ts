import {
  getFrontendVersionFromUrl,
  getUrlWithFrontendVersion,
  isValidFrontendVersion,
} from 'src/features/devtools/components/VersionSwitcher/versionSwitcherUtils';

describe('isValidFrontendVersion', () => {
  it.each(['9.0.0', '9.0.0-preview.12', '4.37.0-pr.6091.receipt-no-data-elements.daa8e9dc'])('accepts %s', (v) => {
    expect(isValidFrontendVersion(v)).toBe(true);
  });

  it.each(['', '9', '9.0', 'v9.0.0', '9.0.0-', 'https://evil.example/x', '../9.0.0', '9.0.0?x=1', '٩.٠.٠'])(
    'rejects %s',
    (v) => {
      expect(isValidFrontendVersion(v)).toBe(false);
    },
  );

  it('rejects too long versions', () => {
    expect(isValidFrontendVersion(`9.0.0-${'a'.repeat(100)}`)).toBe(false);
  });
});

describe('getFrontendVersionFromUrl', () => {
  it('reads the version from the address', () => {
    expect(getFrontendVersionFromUrl('http://local.altinn.cloud/ttd/app/?frontendVersion=9.0.0-preview.10')).toBe(
      '9.0.0-preview.10',
    );
  });

  it('returns an empty string when the parameter is there more than once', () => {
    expect(
      getFrontendVersionFromUrl('http://local.altinn.cloud/ttd/app/?frontendVersion=9.0.0&frontendVersion=9.0.1'),
    ).toBe('');
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
