import {
  customEncodeURI,
  getDialogIdFromDataValues,
  getMessageBoxUrl,
  getUrlWithLanguage,
  logoutUrlAltinn,
  makeUrlRelativeIfSameDomain,
  returnUrlToAccessManagement,
  returnUrlToAllForms,
  returnUrlToArchive,
  returnUrlToPartiesSettings,
  returnUrlToProfile,
  returnUrlToRolesAndRightsHelp,
} from 'src/utils/urls/urlHelper';
import type { IPlatformFrontendSettings } from 'src/types/shared';

// Hosts that once decided whether a platform link was shown. The links now come from the settings alone.
const hosts = [
  'ttd.apps.tt02.altinn.no',
  'ttd.apps.altinn.no',
  'local.altinn.cloud',
  'local.altinn.cloud:8000',
  'local.altinn.test:18000',
  'altinn.test:18000',
  'localhost:5005',
  'altinn.studio',
];

function mockHost(host: string) {
  vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, host });
}

describe('Shared urlHelper.ts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('getMessageBoxUrl() returns the configured inbox URL', () => {
    expect(getMessageBoxUrl()).toBe('https://af.tt02.altinn.no/');
  });

  test('returnUrlToProfile() returns the configured URL', () => {
    expect(returnUrlToProfile()).toBe('https://af.tt02.altinn.no/profile');
  });

  test('returnUrlToAllForms() returns the configured URL', () => {
    window.altinnAppGlobalData.platformFrontendSettings.allFormsUrl = 'https://ny.altinn.no/alle-skjema';

    expect(returnUrlToAllForms()).toBe('https://ny.altinn.no/alle-skjema');
  });

  test('returnUrlToAllForms() returns undefined when no url is configured', () => {
    window.altinnAppGlobalData.platformFrontendSettings.allFormsUrl = undefined;

    expect(returnUrlToAllForms()).toBe(undefined);
  });

  test('returnUrlToArchive() switches party through access management without dialogId', () => {
    expect(returnUrlToArchive(12345)).toBe(
      'https://am.ui.tt02.altinn.no/accessmanagement/api/v1/reportee/changeandredirect?partyId=12345&goTo=https%3A%2F%2Faf.tt02.altinn.no%2F',
    );
  });

  test('returnUrlToArchive() switches party through access management with dialogId', () => {
    const dialogId = '123e4567-e89b-12d3-a456-426614174000';
    expect(returnUrlToArchive(12345, dialogId)).toBe(
      'https://am.ui.tt02.altinn.no/accessmanagement/api/v1/reportee/changeandredirect?partyId=12345&goTo=https%3A%2F%2Faf.tt02.altinn.no%2Finbox%2F123e4567-e89b-12d3-a456-426614174000',
    );
  });

  test('returnUrlToArchive() without partyId', () => {
    expect(returnUrlToArchive(undefined)).toBe('https://af.tt02.altinn.no/');
  });

  test('returnUrlToArchive() with dialogId but without partyId', () => {
    const dialogId = '123e4567-e89b-12d3-a456-426614174000';
    expect(returnUrlToArchive(undefined, dialogId)).toBe(
      'https://af.tt02.altinn.no/inbox/123e4567-e89b-12d3-a456-426614174000',
    );
  });

  describe('the page host plays no part', () => {
    const dialogId = '123e4567-e89b-12d3-a456-426614174000';

    function configureLocalPlatform() {
      window.altinnAppGlobalData.platformFrontendSettings = {
        ...window.altinnAppGlobalData.platformFrontendSettings,
        arbeidsflateInboxUrl: 'http://af.altinn.test:18000/',
        arbeidsflateDialogUrl: 'http://af.altinn.test:18000/inbox/{dialogId}',
        arbeidsflateProfileUrl: 'http://af.altinn.test:18000/profile',
        accessManagementChangeAndRedirectUrl:
          'http://am.altinn.test:18000/accessmanagement/api/v1/reportee/changeandredirect?partyId={partyId}&goTo={goTo}',
        allFormsUrl: 'http://af.altinn.test:18000/skjemaoversikt',
        accessManagementUrl: 'http://am.altinn.test:18000/accessmanagement/ui',
        rolesAndRightsHelpUrl: 'http://af.altinn.test:18000/hjelp/roller',
        arbeidsflatePartiesUrl: 'http://af.altinn.test:18000/profile/parties',
        logoutUrl: 'http://altinn.test:18000/authentication/api/v1/logout',
      };
    }

    test.each(hosts)('the configured URLs are used on %s', (host) => {
      configureLocalPlatform();
      mockHost(host);

      expect(returnUrlToArchive()).toBe('http://af.altinn.test:18000/');
      expect(returnUrlToArchive(undefined, dialogId)).toBe(
        'http://af.altinn.test:18000/inbox/123e4567-e89b-12d3-a456-426614174000',
      );
      expect(returnUrlToArchive(12345, dialogId)).toBe(
        'http://am.altinn.test:18000/accessmanagement/api/v1/reportee/changeandredirect?partyId=12345&goTo=http%3A%2F%2Faf.altinn.test%3A18000%2Finbox%2F123e4567-e89b-12d3-a456-426614174000',
      );
      expect(getMessageBoxUrl(12345)).toBe(
        'http://am.altinn.test:18000/accessmanagement/api/v1/reportee/changeandredirect?partyId=12345&goTo=http%3A%2F%2Faf.altinn.test%3A18000%2F',
      );
      expect(returnUrlToProfile()).toBe('http://af.altinn.test:18000/profile');
      expect(returnUrlToAllForms()).toBe('http://af.altinn.test:18000/skjemaoversikt');
      expect(returnUrlToAccessManagement()).toBe('http://am.altinn.test:18000/accessmanagement/ui');
      expect(returnUrlToRolesAndRightsHelp()).toBe('http://af.altinn.test:18000/hjelp/roller');
      expect(returnUrlToPartiesSettings()).toBe('http://af.altinn.test:18000/profile/parties');
      expect(logoutUrlAltinn()).toBe('http://altinn.test:18000/authentication/api/v1/logout');
    });

    // Localtest no longer falls back to its front page: the runners configure that instead.
    test.each(
      hosts.flatMap((host) => [
        [host, 'not set', undefined],
        [host, 'empty', ''],
      ]),
    )('no link on %s when the settings are %s', (host, _, value) => {
      window.altinnAppGlobalData.platformFrontendSettings = {
        ...window.altinnAppGlobalData.platformFrontendSettings,
        arbeidsflateInboxUrl: value,
        arbeidsflateDialogUrl: value,
        arbeidsflateProfileUrl: value,
        accessManagementChangeAndRedirectUrl: value,
        allFormsUrl: value,
        accessManagementUrl: value,
        rolesAndRightsHelpUrl: value,
        arbeidsflatePartiesUrl: value,
        logoutUrl: value,
      };
      mockHost(host);

      expect(returnUrlToArchive()).toBe(undefined);
      expect(returnUrlToArchive(12345, dialogId)).toBe(undefined);
      expect(getMessageBoxUrl(12345, dialogId)).toBe(undefined);
      expect(returnUrlToProfile()).toBe(undefined);
      expect(returnUrlToAllForms()).toBe(undefined);
      expect(returnUrlToAccessManagement()).toBe(undefined);
      expect(returnUrlToRolesAndRightsHelp()).toBe(undefined);
      expect(returnUrlToPartiesSettings()).toBe(undefined);
      expect(logoutUrlAltinn()).toBe(undefined);
    });
  });

  describe('arbeidsflate URLs come from the runtime config map', () => {
    const dialogId = '123e4567-e89b-12d3-a456-426614174000';

    function configureArbeidsflate(overrides: Partial<IPlatformFrontendSettings>) {
      window.altinnAppGlobalData.platformFrontendSettings = {
        ...window.altinnAppGlobalData.platformFrontendSettings,
        arbeidsflateInboxUrl: undefined,
        arbeidsflateDialogUrl: undefined,
        arbeidsflateProfileUrl: undefined,
        accessManagementChangeAndRedirectUrl: undefined,
        ...overrides,
      };
    }

    // Configures yt01 URLs while the defaults are tt02 ones, so every assertion below fails if the
    // config is not what is read.
    test('the configured URLs are used', () => {
      configureArbeidsflate({
        arbeidsflateInboxUrl: 'https://af.yt01.altinn.cloud/',
        arbeidsflateDialogUrl: 'https://af.yt01.altinn.cloud/inbox/{dialogId}',
        arbeidsflateProfileUrl: 'https://af.yt01.altinn.cloud/profile',
        accessManagementChangeAndRedirectUrl:
          'https://am.ui.yt01.altinn.cloud/accessmanagement/api/v1/reportee/changeandredirect?partyId={partyId}&goTo={goTo}',
      });

      expect(returnUrlToProfile()).toBe('https://af.yt01.altinn.cloud/profile');
      expect(returnUrlToArchive()).toBe('https://af.yt01.altinn.cloud/');
      expect(returnUrlToArchive(undefined, dialogId)).toBe(
        'https://af.yt01.altinn.cloud/inbox/123e4567-e89b-12d3-a456-426614174000',
      );
      expect(returnUrlToArchive(12345)).toBe(
        'https://am.ui.yt01.altinn.cloud/accessmanagement/api/v1/reportee/changeandredirect?partyId=12345&goTo=https%3A%2F%2Faf.yt01.altinn.cloud%2F',
      );
      expect(getMessageBoxUrl()).toBe('https://af.yt01.altinn.cloud/');
    });

    // Guards the reason these are whole URL templates rather than a base URL: the arbeidsflate can
    // restructure its routes and we change configuration, not the frontend bundle.
    test('a changed route structure needs no frontend change', () => {
      configureArbeidsflate({
        arbeidsflateInboxUrl: 'https://ny.altinn.no/meldingsboks',
        arbeidsflateDialogUrl: 'https://ny.altinn.no/meldingsboks?dialog={dialogId}',
        arbeidsflateProfileUrl: 'https://ny.altinn.no/min-profil',
        accessManagementChangeAndRedirectUrl: 'https://ny.altinn.no/bytt?aktor={partyId}&videre={goTo}',
      });

      expect(returnUrlToProfile()).toBe('https://ny.altinn.no/min-profil');
      expect(returnUrlToArchive(undefined, dialogId)).toBe(
        'https://ny.altinn.no/meldingsboks?dialog=123e4567-e89b-12d3-a456-426614174000',
      );
      expect(returnUrlToArchive(12345)).toBe(
        'https://ny.altinn.no/bytt?aktor=12345&videre=https%3A%2F%2Fny.altinn.no%2Fmeldingsboks',
      );
    });

    test('no arbeidsflate link in environments where it is not deployed', () => {
      configureArbeidsflate({});

      expect(returnUrlToProfile()).toBe(undefined);
      expect(returnUrlToArchive()).toBe(undefined);
      expect(returnUrlToArchive(12345, dialogId)).toBe(undefined);
      expect(getMessageBoxUrl()).toBe(undefined);
    });

    test('falls back to the inbox when the dialog or party-switch URL is missing', () => {
      configureArbeidsflate({ arbeidsflateInboxUrl: 'https://af.at23.altinn.cloud/' });

      expect(returnUrlToArchive(undefined, dialogId)).toBe('https://af.at23.altinn.cloud/');
      expect(returnUrlToArchive(12345)).toBe('https://af.at23.altinn.cloud/');
      expect(returnUrlToArchive(12345, dialogId)).toBe('https://af.at23.altinn.cloud/');
    });

    test('placeholder values are encoded', () => {
      configureArbeidsflate({
        arbeidsflateInboxUrl: 'https://af.tt02.altinn.no/',
        arbeidsflateDialogUrl: 'https://af.tt02.altinn.no/inbox/{dialogId}',
      });

      expect(returnUrlToArchive(undefined, 'a/b?c=d')).toBe('https://af.tt02.altinn.no/inbox/a%2Fb%3Fc%3Dd');
    });
  });

  test('getDialogIdFromDataValues() extracts dialog.id correctly', () => {
    expect(getDialogIdFromDataValues({ 'dialog.id': 'abc-123' })).toBe('abc-123');
    expect(getDialogIdFromDataValues({ 'dialog.id': '019aa5f7-ac49-7a56-a824-0381f3603e38' })).toBe(
      '019aa5f7-ac49-7a56-a824-0381f3603e38',
    );
    expect(getDialogIdFromDataValues({ 'dialog.id': 123456 })).toBe('123456');

    // Test with invalid data
    expect(getDialogIdFromDataValues(null)).toBe(undefined);
    expect(getDialogIdFromDataValues(undefined)).toBe(undefined);
    expect(getDialogIdFromDataValues({})).toBe(undefined);
    expect(getDialogIdFromDataValues('string')).toBe(undefined);
    expect(getDialogIdFromDataValues({ 'dialog.id': true })).toBe(undefined);
    expect(getDialogIdFromDataValues({ 'dialog.id': null })).toBe(undefined);
    expect(getDialogIdFromDataValues({ dialog: { id: 'nested' } })).toBe(undefined);
  });

  test('logoutUrlAltinn() returns the configured url', () => {
    window.altinnAppGlobalData.platformFrontendSettings.logoutUrl = 'https://ny.altinn.no/logg-ut';

    expect(logoutUrlAltinn()).toBe('https://ny.altinn.no/logg-ut');
  });

  test('logoutUrlAltinn() returns undefined when no logout url is configured', () => {
    window.altinnAppGlobalData.platformFrontendSettings.logoutUrl = undefined;

    expect(logoutUrlAltinn()).toBe(undefined);
  });

  test('customEncodeURI() returning correct encoding', () => {
    const uri1 = 'https://ttd.apps.tt02.altinn.no/tdd/tjeneste-20190826-1130';
    const uri2 = 'attachment [example].png';
    const uri3 = 'attachment (example).gif';
    const uri4 = 'attachment (example) (1) (2).gif';
    expect(customEncodeURI(uri1)).toBe('https%3A%2F%2Fttd.apps.tt02.altinn.no%2Ftdd%2Ftjeneste-20190826-1130');
    expect(customEncodeURI(uri2)).toBe('attachment%20%5Bexample%5D.png');
    expect(customEncodeURI(uri3)).toBe('attachment%20%28example%29.gif');
    expect(customEncodeURI(uri4)).toBe('attachment%20%28example%29%20%281%29%20%282%29.gif');
  });

  test('makeUrlRelativeIfSameDomain()', () => {
    // Simple testcase make relative
    expect(
      makeUrlRelativeIfSameDomain('https://altinn3local.no/asdf', {
        hostname: 'altinn3local.no',
      } as Location),
    ).toBe('/asdf');
    // Simple testcase domains don't match
    expect(
      makeUrlRelativeIfSameDomain('https://altinn3local.no/asdf', {
        hostname: 'altinn3localno',
      } as Location),
    ).toBe('https://altinn3local.no/asdf');
    // Test with dummyurl
    expect(
      makeUrlRelativeIfSameDomain('dummyurl', {
        hostname: 'altinn3local.no',
      } as Location),
    ).toBe('dummyurl');

    // Test with non-standard port
    expect(
      makeUrlRelativeIfSameDomain('https://altinn3local.no:8080/', {
        hostname: 'altinn3local.no',
      } as Location),
    ).toBe('/');
    expect(
      makeUrlRelativeIfSameDomain('https://altinn3local.no:8080/', {
        hostname: 'altinn3local.no',
      } as Location),
    ).toBe('/');
  });

  describe('instantiation help URLs come from the runtime config map', () => {
    test('the configured URLs are used', () => {
      window.altinnAppGlobalData.platformFrontendSettings = {
        ...window.altinnAppGlobalData.platformFrontendSettings,
        accessManagementUrl: 'https://ny.altinn.no/tilganger',
        rolesAndRightsHelpUrl: 'https://ny.altinn.no/hjelp/roller',
        arbeidsflatePartiesUrl: 'https://ny.altinn.no/profil/aktorer',
      };

      expect(returnUrlToAccessManagement()).toBe('https://ny.altinn.no/tilganger');
      expect(returnUrlToRolesAndRightsHelp()).toBe('https://ny.altinn.no/hjelp/roller');
      expect(returnUrlToPartiesSettings()).toBe('https://ny.altinn.no/profil/aktorer');
    });

    test('no link when not configured', () => {
      window.altinnAppGlobalData.platformFrontendSettings = {
        ...window.altinnAppGlobalData.platformFrontendSettings,
        accessManagementUrl: undefined,
        rolesAndRightsHelpUrl: undefined,
        arbeidsflatePartiesUrl: undefined,
      };

      expect(returnUrlToAccessManagement()).toBe(undefined);
      expect(returnUrlToRolesAndRightsHelp()).toBe(undefined);
      expect(returnUrlToPartiesSettings()).toBe(undefined);
    });
  });

  describe('getUrlWithLanguage', () => {
    const testCases = [
      {
        url: 'https://local.altinn.cloud/ttd/test/instances/12345/123-123-123/data/456-456-456?includeRowId=true',
        language: 'nb',
        expected:
          'https://local.altinn.cloud/ttd/test/instances/12345/123-123-123/data/456-456-456?includeRowId=true&language=nb',
      },
      {
        url: 'https://local.altinn.cloud/ttd/test/instances/12345/123-123-123/data/456-456-456',
        language: 'en',
        expected: 'https://local.altinn.cloud/ttd/test/instances/12345/123-123-123/data/456-456-456?language=en',
      },
      {
        url: 'https://local.altinn.cloud/ttd/test/instances/12345/123-123-123/data/456-456-456?language=en',
        language: 'nb',
        expected: 'https://local.altinn.cloud/ttd/test/instances/12345/123-123-123/data/456-456-456?language=nb',
      },
      {
        url: undefined,
        language: 'nb',
        expected: undefined,
      },
      {
        url: 'https://local.altinn.cloud/ttd/test/instances/12345/123-123-123/data/456-456-456?language=en',
        language: undefined,
        expected: 'https://local.altinn.cloud/ttd/test/instances/12345/123-123-123/data/456-456-456',
      },
      {
        url: 'https://local.altinn.cloud/ttd/test/instances/12345/123-123-123/data/456-456-456?language=nb&includeRowId=true',
        language: undefined,
        expected: 'https://local.altinn.cloud/ttd/test/instances/12345/123-123-123/data/456-456-456?includeRowId=true',
      },
      {
        url: 'https://local.altinn.cloud/ttd/test/instances/12345/123-123-123/data/456-456-456',
        language: undefined,
        expected: 'https://local.altinn.cloud/ttd/test/instances/12345/123-123-123/data/456-456-456',
      },
    ];
    it.each(testCases)('url: $url, language: $language should result in $expected', ({ url, language, expected }) => {
      expect(getUrlWithLanguage(url, language)).toBe(expected);
    });
  });
});
