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

const hostTT = 'ttd.apps.tt02.altinn.no';
const hostProd = 'ttd.apps.altinn.no';
const hostDocker = 'local.altinn.cloud';
const hostPodman = 'local.altinn.cloud:8000';
const hostStudio = 'altinn.studio';
const hostStudioDev = 'dev.altinn.studio';
const hostUnknown = 'www.vg.no';

describe('Shared urlHelper.ts', () => {
  test('returnUrlToMessageBox() returning correct environemnts', () => {
    vi.spyOn(window, 'location', 'get').mockReturnValueOnce({ host: hostTT } as Location);
    expect(getMessageBoxUrl()).toBe('https://af.tt02.altinn.no/');
    vi.spyOn(window, 'location', 'get').mockReturnValueOnce({ host: hostStudio } as Location);
    expect(getMessageBoxUrl()).toBe(undefined);
    vi.spyOn(window, 'location', 'get').mockReturnValueOnce({ host: hostStudioDev } as Location);
    expect(getMessageBoxUrl()).toBe(undefined);
    vi.spyOn(window, 'location', 'get').mockReturnValueOnce({ host: hostUnknown } as Location);
    expect(getMessageBoxUrl()).toBe(undefined);
  });

  test('returnUrlTProfile() returning correct environments', () => {
    expect(returnUrlToProfile(hostTT)).toBe('https://af.tt02.altinn.no/profile');
    expect(returnUrlToProfile(hostStudio)).toBe(undefined);
    expect(returnUrlToProfile(hostStudioDev)).toBe(undefined);
    expect(returnUrlToProfile(hostUnknown)).toBe(undefined);
  });

  test('returnUrlAllForms() returning correct environments', () => {
    expect(returnUrlToAllForms(hostTT)).toBe('https://tt02.altinn.no/skjemaoversikt');
    expect(returnUrlToAllForms(hostStudio)).toBe(undefined);
    expect(returnUrlToAllForms(hostStudioDev)).toBe(undefined);
    expect(returnUrlToAllForms(hostUnknown)).toBe(undefined);
  });

  test('returnUrlToAllForms() uses the configured url, not one derived from the host', () => {
    window.altinnAppGlobalData.platformFrontendSettings.allFormsUrl = 'https://ny.altinn.no/alle-skjema';

    expect(returnUrlToAllForms(hostTT)).toBe('https://ny.altinn.no/alle-skjema');
    expect(returnUrlToAllForms(hostProd)).toBe('https://ny.altinn.no/alle-skjema');
  });

  test('returnUrlToAllForms() returns undefined when no url is configured', () => {
    window.altinnAppGlobalData.platformFrontendSettings.allFormsUrl = undefined;

    expect(returnUrlToAllForms(hostTT)).toBe(undefined);
  });

  test('returnUrlToArchive() returning correct environments without dialogId', () => {
    const partyId = 12345;
    expect(returnUrlToArchive(hostTT, partyId)).toBe(
      'https://am.ui.tt02.altinn.no/accessmanagement/api/v1/reportee/changeandredirect?partyId=12345&goTo=https%3A%2F%2Faf.tt02.altinn.no%2F',
    );
    expect(returnUrlToArchive(hostStudio, partyId)).toBe(undefined);
    expect(returnUrlToArchive(hostStudioDev, partyId)).toBe(undefined);
    expect(returnUrlToArchive(hostUnknown, partyId)).toBe(undefined);
  });

  test('returnUrlToArchive() returning correct environments with dialogId', () => {
    const partyId = 12345;
    const dialogId = '123e4567-e89b-12d3-a456-426614174000';
    expect(returnUrlToArchive(hostTT, partyId, dialogId)).toBe(
      'https://am.ui.tt02.altinn.no/accessmanagement/api/v1/reportee/changeandredirect?partyId=12345&goTo=https%3A%2F%2Faf.tt02.altinn.no%2Finbox%2F123e4567-e89b-12d3-a456-426614174000',
    );
  });

  test('returnUrlToArchive() returning correct environments without partyId', () => {
    expect(returnUrlToArchive(hostTT, undefined)).toBe('https://af.tt02.altinn.no/');
    expect(returnUrlToArchive(hostStudio, undefined)).toBe(undefined);
    expect(returnUrlToArchive(hostStudioDev, undefined)).toBe(undefined);
    expect(returnUrlToArchive(hostUnknown, undefined)).toBe(undefined);
  });

  test('returnUrlToArchive() returning correct environments with dialogId but without partyId', () => {
    const dialogId = '123e4567-e89b-12d3-a456-426614174000';
    expect(returnUrlToArchive(hostTT, undefined, dialogId)).toBe(
      'https://af.tt02.altinn.no/inbox/123e4567-e89b-12d3-a456-426614174000',
    );
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

    // Configures yt01 URLs while asking for a tt02 host: host derivation would answer
    // af.tt02.altinn.no, so every assertion below fails if the config is not what is read.
    test('the configured URLs are used, not ones derived from the host', () => {
      configureArbeidsflate({
        arbeidsflateInboxUrl: 'https://af.yt01.altinn.cloud/',
        arbeidsflateDialogUrl: 'https://af.yt01.altinn.cloud/inbox/{dialogId}',
        arbeidsflateProfileUrl: 'https://af.yt01.altinn.cloud/profile',
        accessManagementChangeAndRedirectUrl:
          'https://am.ui.yt01.altinn.cloud/accessmanagement/api/v1/reportee/changeandredirect?partyId={partyId}&goTo={goTo}',
      });

      expect(returnUrlToProfile(hostTT)).toBe('https://af.yt01.altinn.cloud/profile');
      expect(returnUrlToArchive(hostTT)).toBe('https://af.yt01.altinn.cloud/');
      expect(returnUrlToArchive(hostTT, undefined, dialogId)).toBe(
        'https://af.yt01.altinn.cloud/inbox/123e4567-e89b-12d3-a456-426614174000',
      );
      expect(returnUrlToArchive(hostTT, 12345)).toBe(
        'https://am.ui.yt01.altinn.cloud/accessmanagement/api/v1/reportee/changeandredirect?partyId=12345&goTo=https%3A%2F%2Faf.yt01.altinn.cloud%2F',
      );

      // getMessageBoxUrl() reads the host off window.location rather than taking it as an argument
      vi.spyOn(window, 'location', 'get').mockReturnValueOnce({ host: hostTT } as Location);
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

      expect(returnUrlToProfile(hostTT)).toBe('https://ny.altinn.no/min-profil');
      expect(returnUrlToArchive(hostTT, undefined, dialogId)).toBe(
        'https://ny.altinn.no/meldingsboks?dialog=123e4567-e89b-12d3-a456-426614174000',
      );
      expect(returnUrlToArchive(hostTT, 12345)).toBe(
        'https://ny.altinn.no/bytt?aktor=12345&videre=https%3A%2F%2Fny.altinn.no%2Fmeldingsboks',
      );
    });


    test('no arbeidsflate link in environments where it is not deployed', () => {
      configureArbeidsflate({});

      expect(returnUrlToProfile(hostTT)).toBe(undefined);
      expect(returnUrlToArchive(hostTT)).toBe(undefined);
      expect(returnUrlToArchive(hostTT, 12345, dialogId)).toBe(undefined);
      vi.spyOn(window, 'location', 'get').mockReturnValueOnce({ host: hostTT } as Location);
      expect(getMessageBoxUrl()).toBe(undefined);
    });

    test('falls back to the inbox when the dialog or party-switch URL is missing', () => {
      configureArbeidsflate({ arbeidsflateInboxUrl: 'https://af.at23.altinn.cloud/' });

      expect(returnUrlToArchive(hostTT, undefined, dialogId)).toBe('https://af.at23.altinn.cloud/');
      expect(returnUrlToArchive(hostTT, 12345)).toBe('https://af.at23.altinn.cloud/');
      expect(returnUrlToArchive(hostTT, 12345, dialogId)).toBe('https://af.at23.altinn.cloud/');
    });

    test('placeholder values are encoded', () => {
      configureArbeidsflate({
        arbeidsflateInboxUrl: 'https://af.tt02.altinn.no/',
        arbeidsflateDialogUrl: 'https://af.tt02.altinn.no/inbox/{dialogId}',
      });

      expect(returnUrlToArchive(hostTT, undefined, 'a/b?c=d')).toBe('https://af.tt02.altinn.no/inbox/a%2Fb%3Fc%3Dd');
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

  test('logoutUrlAltinn() returning correct environments', () => {
    expect(logoutUrlAltinn(hostTT)).toBe('https://platform.tt02.altinn.no/authentication/api/v1/logout');
    expect(logoutUrlAltinn(hostStudio)).toBe(undefined);
    expect(logoutUrlAltinn(hostStudioDev)).toBe(undefined);
    expect(logoutUrlAltinn(hostUnknown)).toBe(undefined);
  });

  test('logoutUrlAltinn() uses the configured url, not one derived from the host', () => {
    window.altinnAppGlobalData.platformFrontendSettings.logoutUrl = 'https://ny.altinn.no/logg-ut';

    expect(logoutUrlAltinn(hostTT)).toBe('https://ny.altinn.no/logg-ut');
    expect(logoutUrlAltinn(hostProd)).toBe('https://ny.altinn.no/logg-ut');
  });

  test('logoutUrlAltinn() returns undefined when no logout url is configured', () => {
    window.altinnAppGlobalData.platformFrontendSettings.logoutUrl = undefined;

    expect(logoutUrlAltinn(hostTT)).toBe(undefined);
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
    const helpUrls = [returnUrlToAccessManagement, returnUrlToRolesAndRightsHelp, returnUrlToPartiesSettings];

    test('the configured URLs are used on Altinn hosts', () => {
      window.altinnAppGlobalData.platformFrontendSettings = {
        ...window.altinnAppGlobalData.platformFrontendSettings,
        accessManagementUrl: 'https://ny.altinn.no/tilganger',
        rolesAndRightsHelpUrl: 'https://ny.altinn.no/hjelp/roller',
        arbeidsflatePartiesUrl: 'https://ny.altinn.no/profil/aktorer',
      };

      expect(returnUrlToAccessManagement(hostProd)).toBe('https://ny.altinn.no/tilganger');
      expect(returnUrlToRolesAndRightsHelp(hostProd)).toBe('https://ny.altinn.no/hjelp/roller');
      expect(returnUrlToPartiesSettings(hostProd)).toBe('https://ny.altinn.no/profil/aktorer');
    });


    test('no link on unknown hosts or when not configured', () => {
      for (const helpUrl of helpUrls) {
        expect(helpUrl(hostStudio)).toBe(undefined);
        expect(helpUrl(hostUnknown)).toBe(undefined);
      }

      window.altinnAppGlobalData.platformFrontendSettings = {
        ...window.altinnAppGlobalData.platformFrontendSettings,
        accessManagementUrl: undefined,
        rolesAndRightsHelpUrl: undefined,
        arbeidsflatePartiesUrl: undefined,
      };
      for (const helpUrl of helpUrls) {
        expect(helpUrl(hostTT)).toBe(undefined);
      }
    });
  });

  describe('localtest uses the configured URLs when set, otherwise its front page', () => {
    const dialogId = '123e4567-e89b-12d3-a456-426614174000';
    const localHosts = [hostDocker, hostPodman];

    function configureLocalPlatform() {
      window.altinnAppGlobalData.platformFrontendSettings = {
        ...window.altinnAppGlobalData.platformFrontendSettings,
        arbeidsflateInboxUrl: 'http://af.local.altinn.cloud/',
        arbeidsflateDialogUrl: 'http://af.local.altinn.cloud/inbox/{dialogId}',
        arbeidsflateProfileUrl: 'http://af.local.altinn.cloud/profile',
        accessManagementChangeAndRedirectUrl:
          'http://am.local.altinn.cloud/accessmanagement/api/v1/reportee/changeandredirect?partyId={partyId}&goTo={goTo}',
        allFormsUrl: 'http://af.local.altinn.cloud/skjemaoversikt',
        accessManagementUrl: 'http://am.local.altinn.cloud/accessmanagement/ui',
        rolesAndRightsHelpUrl: 'http://af.local.altinn.cloud/hjelp/roller',
        arbeidsflatePartiesUrl: 'http://af.local.altinn.cloud/profile/parties',
        logoutUrl: 'http://local.altinn.cloud/authentication/api/v1/logout',
      };
    }

    test.each(localHosts)('the configured URLs are used on %s', (host) => {
      configureLocalPlatform();

      expect(returnUrlToArchive(host)).toBe('http://af.local.altinn.cloud/');
      expect(returnUrlToArchive(host, undefined, dialogId)).toBe(
        'http://af.local.altinn.cloud/inbox/123e4567-e89b-12d3-a456-426614174000',
      );
      expect(returnUrlToArchive(host, 12345)).toBe(
        'http://am.local.altinn.cloud/accessmanagement/api/v1/reportee/changeandredirect?partyId=12345&goTo=http%3A%2F%2Faf.local.altinn.cloud%2F',
      );
      expect(returnUrlToArchive(host, 12345, dialogId)).toBe(
        'http://am.local.altinn.cloud/accessmanagement/api/v1/reportee/changeandredirect?partyId=12345&goTo=http%3A%2F%2Faf.local.altinn.cloud%2Finbox%2F123e4567-e89b-12d3-a456-426614174000',
      );
      vi.spyOn(window, 'location', 'get').mockReturnValueOnce({ host } as Location);
      expect(getMessageBoxUrl(12345)).toBe(
        'http://am.local.altinn.cloud/accessmanagement/api/v1/reportee/changeandredirect?partyId=12345&goTo=http%3A%2F%2Faf.local.altinn.cloud%2F',
      );
      expect(returnUrlToProfile(host)).toBe('http://af.local.altinn.cloud/profile');
      expect(returnUrlToAllForms(host)).toBe('http://af.local.altinn.cloud/skjemaoversikt');
      expect(returnUrlToAccessManagement(host)).toBe('http://am.local.altinn.cloud/accessmanagement/ui');
      expect(returnUrlToRolesAndRightsHelp(host)).toBe('http://af.local.altinn.cloud/hjelp/roller');
      expect(returnUrlToPartiesSettings(host)).toBe('http://af.local.altinn.cloud/profile/parties');
      expect(logoutUrlAltinn(host)).toBe('http://local.altinn.cloud/authentication/api/v1/logout');
    });

    test('without the party switch the target URL is used', () => {
      configureLocalPlatform();
      window.altinnAppGlobalData.platformFrontendSettings.accessManagementChangeAndRedirectUrl = undefined;

      expect(returnUrlToArchive(hostPodman, 12345)).toBe('http://af.local.altinn.cloud/');
      expect(returnUrlToArchive(hostPodman, 12345, dialogId)).toBe(
        'http://af.local.altinn.cloud/inbox/123e4567-e89b-12d3-a456-426614174000',
      );
    });

    test.each([
      ['not set', undefined],
      ['empty', ''],
    ])('the front page is used when the settings are %s', (_, value) => {
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

      for (const host of localHosts) {
        const frontPage = `http://${host}/`;
        expect(returnUrlToArchive(host)).toBe(frontPage);
        expect(returnUrlToArchive(host, 12345, dialogId)).toBe(frontPage);
        vi.spyOn(window, 'location', 'get').mockReturnValueOnce({ host } as Location);
        expect(getMessageBoxUrl(12345, dialogId)).toBe(frontPage);
        expect(returnUrlToProfile(host)).toBe(frontPage);
        expect(returnUrlToAllForms(host)).toBe(frontPage);
        expect(returnUrlToAccessManagement(host)).toBe(frontPage);
        expect(returnUrlToRolesAndRightsHelp(host)).toBe(frontPage);
        expect(returnUrlToPartiesSettings(host)).toBe(frontPage);
        expect(logoutUrlAltinn(host)).toBe(frontPage);
      }
    });

    // local.altinn.cloud is the only host outside the recognized Altinn hosts that gets a settings link
    test('unrecognized hosts still get no link with the settings set', () => {
      configureLocalPlatform();

      for (const host of ['localhost', 'localhost:8000', hostStudio, hostUnknown]) {
        expect(returnUrlToArchive(host, 12345, dialogId)).toBe(undefined);
        expect(returnUrlToProfile(host)).toBe(undefined);
        expect(returnUrlToAllForms(host)).toBe(undefined);
        expect(returnUrlToAccessManagement(host)).toBe(undefined);
        expect(logoutUrlAltinn(host)).toBe(undefined);
      }
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
