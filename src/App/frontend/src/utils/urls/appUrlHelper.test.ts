import {
  getCreateInstancesUrl,
  getDataListsUrl,
  getEnvironmentLoginUrl,
  getHostname,
  getInstantiateUrl,
  getOptionsUrl,
  getSetSelectedPartyUrl,
  getUpgradeAuthLevelUrl,
  redirectToUpgrade,
} from 'src/utils/urls/appUrlHelper';

describe('Frontend urlHelper.ts', () => {
  describe('constants', () => {
    it('should return the expected url for getSetSelectedPartyUrl', () => {
      expect(getSetSelectedPartyUrl(12345)).toBe('https://local.altinn.cloud/ttd/test/api/v1/parties/12345');
    });
    it('should return the expected url for getInstantiateUrl', () => {
      expect(getInstantiateUrl()).toBe('https://local.altinn.cloud/ttd/test/instances/create');
    });
    it('should return the expected url for getInstantiateUrl with language', () => {
      expect(getInstantiateUrl('en')).toBe('https://local.altinn.cloud/ttd/test/instances/create?language=en');
    });
    it('should return the expected url for getCreateInstancesUrl', () => {
      expect(getCreateInstancesUrl(12345)).toBe(
        'https://local.altinn.cloud/ttd/test/instances?instanceOwnerPartyId=12345',
      );
    });
    it('should return the expected url for getCreateInstancesUrl with language', () => {
      expect(getCreateInstancesUrl(12345, 'en')).toBe(
        'https://local.altinn.cloud/ttd/test/instances?instanceOwnerPartyId=12345&language=en',
      );
    });
    it('should return the expected url for getUpgradeAuthLevelUrl', () => {
      expect(getUpgradeAuthLevelUrl()).toBe(
        'https://platform.tt02.altinn.no/authentication/api/v1/authentication?goTo=https%3A%2F%2Flocal.altinn.cloud%2Fttd%2Ftest&acr_values=idporten-loa-high',
      );
    });
  });
  describe('mutated window', () => {
    const resetWindow = (
      location: Partial<Location> = {
        origin: 'https://ttd.apps.altinn.no',
        pathname: '/ttd/jesttest/',
        host: 'https://ttd.apps.altinn.no',
        href: 'https://ttd.apps.altinn.no/ttd/test',
      },
    ) => {
      const oldWindowLocation = window.location;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).location;
      // @ts-expect-error: can be removed when this issue is fixed: https://github.com/microsoft/TypeScript/issues/61335
      window.location = {
        ...oldWindowLocation,
        ...location,
      };
    };
    describe('util', () => {
      it('changes the window location', () => {
        resetWindow();
        expect(window.location.href).toBe('https://ttd.apps.altinn.no/ttd/test');
        redirectToUpgrade();
        expect(window.location.href).toBe(
          'https://platform.tt02.altinn.no/authentication/api/v1/authentication?goTo=https%3A%2F%2Flocal.altinn.cloud%2Fttd%2Ftest&acr_values=idporten-loa-high',
        );
      });

      it('does not navigate when no step-up url is configured', () => {
        resetWindow();
        window.altinnAppGlobalData.platformFrontendSettings.upgradeAuthenticationLevelUrl = undefined;

        redirectToUpgrade();

        expect(window.location.href).toBe('https://ttd.apps.altinn.no/ttd/test');
      });
    });
    describe('getEnvironmentLoginUrl', () => {
      const loginUrl = 'https://platform.tt02.altinn.no/authentication/api/v1/authentication';

      beforeEach(() => {
        resetWindow();
      });

      it('appends the oidc provider when the app specifies one', () => {
        expect(getEnvironmentLoginUrl('idporten')).toEqual(
          `${loginUrl}?goto=https%3A%2F%2Fttd.apps.altinn.no%2Fttd%2Ftest&iss=idporten`,
        );
      });

      it.each([null, ''])('omits the oidc provider when it is %p', (oidcProvider) => {
        expect(getEnvironmentLoginUrl(oidcProvider)).toEqual(
          `${loginUrl}?goto=https%3A%2F%2Fttd.apps.altinn.no%2Fttd%2Ftest`,
        );
      });

      it('starts the query string when the configured url has none', () => {
        window.altinnAppGlobalData.platformFrontendSettings.loginUrl = 'https://ny.altinn.no/logg-inn';

        expect(getEnvironmentLoginUrl('idporten')).toEqual('https://ny.altinn.no/logg-inn?iss=idporten');
      });

      it('returns undefined when no login url is configured', () => {
        window.altinnAppGlobalData.platformFrontendSettings.loginUrl = undefined;

        expect(getEnvironmentLoginUrl('idporten')).toBe(undefined);
      });
    });

    describe('authentication urls come from the runtime config map', () => {
      // Configures yt01 URLs while the window host says altinn.no: host derivation would answer
      // platform.altinn.no, so every assertion below fails if the config is not what is read.
      it('uses the configured urls, not ones derived from window.location.host', () => {
        resetWindow();
        window.altinnAppGlobalData.platformFrontendSettings = {
          ...window.altinnAppGlobalData.platformFrontendSettings,
          loginUrl: 'https://platform.yt01.altinn.cloud/authentication/api/v1/authentication?goto={goTo}',
          upgradeAuthenticationLevelUrl:
            'https://platform.yt01.altinn.cloud/authentication/api/v1/authentication?goTo={goTo}&acr_values=idporten-loa-high',
        };

        expect(getEnvironmentLoginUrl(null)).toBe(
          'https://platform.yt01.altinn.cloud/authentication/api/v1/authentication?goto=https%3A%2F%2Fttd.apps.altinn.no%2Fttd%2Ftest',
        );
        expect(getUpgradeAuthLevelUrl()).toBe(
          'https://platform.yt01.altinn.cloud/authentication/api/v1/authentication?goTo=https%3A%2F%2Flocal.altinn.cloud%2Fttd%2Ftest&acr_values=idporten-loa-high',
        );
      });

      // Guards the reason these are whole URL templates rather than a base URL: the platform can
      // restructure its authentication routes and we change configuration, not the frontend bundle.
      it('a changed route structure needs no frontend change', () => {
        resetWindow();
        window.altinnAppGlobalData.platformFrontendSettings = {
          ...window.altinnAppGlobalData.platformFrontendSettings,
          loginUrl: 'https://ny.altinn.no/logg-inn?tilbake={goTo}',
          upgradeAuthenticationLevelUrl: 'https://ny.altinn.no/nivaaheving?tilbake={goTo}&nivaa=hoyt',
        };

        expect(getEnvironmentLoginUrl(null)).toBe(
          'https://ny.altinn.no/logg-inn?tilbake=https%3A%2F%2Fttd.apps.altinn.no%2Fttd%2Ftest',
        );
        expect(getUpgradeAuthLevelUrl()).toBe(
          'https://ny.altinn.no/nivaaheving?tilbake=https%3A%2F%2Flocal.altinn.cloud%2Fttd%2Ftest&nivaa=hoyt',
        );
      });
    });

    describe('getHostname', () => {
      it('should return correct hostname when host has 5 domain parts', () => {
        resetWindow({
          host: 'my.ttd.apps.altinn.no',
        });
        expect(getHostname()).toEqual('apps.altinn.no');
      });

      it('should return correct hostname when host has 4 domain parts', () => {
        resetWindow({
          host: 'ttd.apps.altinn.no',
        });

        expect(getHostname()).toEqual('altinn.no');
      });

      it('should return correct hostname when host has 2 domain parts, and the first part is "altinn3local"', () => {
        resetWindow({
          host: 'local.altinn.cloud',
        });
        expect(getHostname()).toEqual('local.altinn.cloud');
      });

      it('should return correct hostname for new local test url', () => {
        resetWindow({
          host: 'local.altinn.cloud',
        });
        expect(getHostname()).toEqual('local.altinn.cloud');
      });

      it('should throw error when hostname has 3 parts', () => {
        resetWindow({
          host: 'apps.altinn.no',
        });
        expect(getHostname).toThrow('Unknown domain');
      });

      it('should throw error when hostname has too many parts', () => {
        resetWindow({
          host: 'too.many.host.parts.altinn.no',
        });
        expect(getHostname).toThrow('Unknown domain');
      });
    });
  });

  describe('getOptionsUrl', () => {
    it('should return correct url when no language or formData/dataMapping is provided', () => {
      const result = getOptionsUrl({
        optionsId: 'county',
      });

      expect(result).toEqual('https://local.altinn.cloud/ttd/test/api/options/county');
    });

    it('should return correct url when language is passed and no formData/dataMapping is provided', () => {
      const result = getOptionsUrl({
        optionsId: 'county',
        language: 'en',
      });

      expect(result).toEqual('https://local.altinn.cloud/ttd/test/api/options/county?language=en');
    });

    it('should return correct url when no language is passed and formData/dataMapping is provided', () => {
      const result = getOptionsUrl({
        optionsId: 'country',
        queryParameters: {
          selectedCountry: 'Norway',
        },
      });

      expect(result).toEqual('https://local.altinn.cloud/ttd/test/api/options/country?selectedCountry=Norway');
    });

    it('should return correct url when fixed query parameters is provided', () => {
      const result = getOptionsUrl({
        optionsId: 'country',
        queryParameters: {
          level: '1',
        },
      });

      expect(result).toEqual('https://local.altinn.cloud/ttd/test/api/options/country?level=1');
    });

    it('should return correct url when fixed query parameters and dataMapping is provided', () => {
      const result = getOptionsUrl({
        optionsId: 'country',
        queryParameters: {
          level: '1',
          selectedCountry: 'Norway',
        },
      });

      expect(result).toEqual('https://local.altinn.cloud/ttd/test/api/options/country?level=1&selectedCountry=Norway');
    });

    it('should return correct url when both language is passed and formData/dataMapping is provided', () => {
      const result = getOptionsUrl({
        optionsId: 'country',
        language: 'en',
        queryParameters: {
          selectedCountry: 'Norway',
          selectedPostCode: '0123',
        },
      });

      expect(result).toEqual(
        'https://local.altinn.cloud/ttd/test/api/options/country?language=en&selectedCountry=Norway&selectedPostCode=0123',
      );
    });

    it('should return instance aware url when secure param is passed for secure option', () => {
      const result = getOptionsUrl({
        optionsId: 'country',
        language: 'en',
        queryParameters: {
          selectedCountry: 'Norway',
          selectedPostCode: '0123',
        },
        secure: true,
        instanceId: 'someInstanceId',
      });

      expect(result).toEqual(
        'https://local.altinn.cloud/ttd/test/instances/someInstanceId/options/country?language=en&selectedCountry=Norway&selectedPostCode=0123',
      );
    });

    it('should return instance aware url when no language or formData/dataMapping is provided for secure option', () => {
      const result = getOptionsUrl({
        optionsId: 'country',
        secure: true,
        instanceId: 'someInstanceId',
      });

      expect(result).toEqual('https://local.altinn.cloud/ttd/test/instances/someInstanceId/options/country');
    });
  });

  describe('getDataListsUrl', () => {
    it('should return correct url when no language, pagination or sorting parameters are provided', () => {
      const result = getDataListsUrl({ dataListId: 'country' });
      expect(result).toEqual('https://local.altinn.cloud/ttd/test/api/datalists/country');
    });

    it('should return correct url when a language parameter is provided, but no pagination or sorting parameters are provided', () => {
      const result = getDataListsUrl({ dataListId: 'country', language: 'no' });
      expect(result).toEqual('https://local.altinn.cloud/ttd/test/api/datalists/country?language=no');
    });

    it('should return correct url when only sorting paramters are provided', () => {
      const result = getDataListsUrl({
        dataListId: 'country',
        sortColumn: 'id',
        sortDirection: 'desc',
      });
      expect(result).toEqual(
        'https://local.altinn.cloud/ttd/test/api/datalists/country?sortColumn=id&sortDirection=desc',
      );
    });

    it('should return correct url when only pagination paramters are provided', () => {
      const result = getDataListsUrl({
        dataListId: 'country',
        pageSize: '10',
        pageNumber: '2',
      });
      expect(result).toEqual('https://local.altinn.cloud/ttd/test/api/datalists/country?size=10&page=2');
    });

    it('should return correct url when formData/dataMapping is provided', () => {
      const result = getDataListsUrl({
        dataListId: 'country',
        queryParameters: {
          selectedCountry: 'Norway',
        },
      });

      expect(result).toEqual('https://local.altinn.cloud/ttd/test/api/datalists/country?selectedCountry=Norway');
    });

    it('should render correct url when formData/Mapping, language, pagination and sorting paramters are provided', () => {
      const result = getDataListsUrl({
        dataListId: 'country',
        queryParameters: {
          selectedCountry: 'Norway',
        },
        pageSize: '10',
        pageNumber: '2',
        sortColumn: 'id',
        sortDirection: 'desc',
        language: 'no',
      });

      expect(result).toEqual(
        'https://local.altinn.cloud/ttd/test/api/datalists/country?language=no&size=10&page=2&sortColumn=id&sortDirection=desc&selectedCountry=Norway',
      );
    });
  });
});
