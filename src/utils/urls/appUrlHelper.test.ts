import {
  getCreateInstancesUrl,
  getDataListsUrl,
  getDataValidationUrl,
  getEnvironmentLoginUrl,
  getFetchFormDynamicsUrl,
  getHostname,
  getLayoutSettingsUrl,
  getLayoutsUrl,
  getOptionsUrl,
  getProcessStateUrl,
  getRedirectUrl,
  getRulehandlerUrl,
  getSetCurrentPartyUrl,
  getUpgradeAuthLevelUrl,
  getValidationUrl,
  redirectToUpgrade,
  textResourcesUrl,
  validPartiesUrl,
} from 'src/utils/urls/appUrlHelper';

describe('Frontend urlHelper.ts', () => {
  describe('constants', () => {
    it('should return the expected url for validPartiesUrl', () => {
      expect(validPartiesUrl).toBe(
        'https://local.altinn.cloud/ttd/test/api/v1/parties?allowedtoinstantiatefilter=true',
      );
    });
    it('should return the expected url for getSetCurrentPartyUrl', () => {
      expect(getSetCurrentPartyUrl(12345)).toBe('https://local.altinn.cloud/ttd/test/api/v1/parties/12345');
    });
    it('should return the expected url for textResourcesUrl', () => {
      expect(textResourcesUrl('nb')).toBe('https://local.altinn.cloud/ttd/test/api/v1/texts/nb');
    });
    it('should return the expected url for getProcessStateUrl', () => {
      expect(getProcessStateUrl('12345/instanceId-1234')).toBe(
        'https://local.altinn.cloud/ttd/test/instances/12345/instanceId-1234/process',
      );
    });
    it('should return the expected url for getCreateInstancesUrl', () => {
      expect(getCreateInstancesUrl(12345)).toBe(
        'https://local.altinn.cloud/ttd/test/instances?instanceOwnerPartyId=12345',
      );
    });
    it('should return the expected url for getValidationUrl', () => {
      expect(getValidationUrl('12345/instanceId-1234')).toBe(
        'https://local.altinn.cloud/ttd/test/instances/12345/instanceId-1234/validate',
      );
    });
    it('should return the expected url for getDataValidationUrl', () => {
      expect(getDataValidationUrl('12345/instanceId-1234', 'dataGuid', 'nb')).toBe(
        'https://local.altinn.cloud/ttd/test/instances/12345/instanceId-1234/data/dataGuid/validate?language=nb',
      );
    });
    it('should return the expected url for getRedirectUrl', () => {
      expect(getRedirectUrl('http://www.nrk.no')).toBe(
        'https://local.altinn.cloud/ttd/test/api/v1/redirect?url=http%3A%2F%2Fwww.nrk.no',
      );
    });
    it('should return the expected url for getUpgradeAuthLevelUrl', () => {
      expect(getUpgradeAuthLevelUrl('overlord')).toBe(
        'https://local.altinn.cloud/ui/authentication/upgrade?goTo=https%3A%2F%2Fplatform.local.altinn.cloud%2Fauthentication%2Fapi%2Fv1%2Fauthentication%3Fgoto%3Dhttps%3A%2F%2Flocal.altinn.cloud%2Fttd%2Ftest&reqAuthLevel=overlord',
      );
    });
  });
  describe('mutated window', () => {
    const resetWindow = (
      location: Partial<Location> = {
        origin: 'https://ttd.apps.altinn.no',
        hash: '#/datamodelling',
        pathname: '/ttd/jesttest/',
        host: 'https://ttd.apps.altinn.no',
        href: 'https://ttd.apps.altinn.no/ttd/test',
      },
    ) => {
      const oldWindowLocation = window.location;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).location;
      window.location = {
        ...oldWindowLocation,
        ...location,
      };
    };
    describe('util', () => {
      it('should return the expected url for getUpgradeAuthLevelUrl', () => {
        resetWindow();
        expect(getUpgradeAuthLevelUrl('overlord')).toBe(
          'https://altinn.no/ui/authentication/upgrade?goTo=https%3A%2F%2Fplatform.altinn.no%2Fauthentication%2Fapi%2Fv1%2Fauthentication%3Fgoto%3Dhttps%3A%2F%2Flocal.altinn.cloud%2Fttd%2Ftest&reqAuthLevel=overlord',
        );
      });
      it('changes the window location', () => {
        resetWindow();
        expect(window.location.href).toBe('https://ttd.apps.altinn.no/ttd/test');
        redirectToUpgrade('overlord');
        expect(window.location.href).toBe(
          'https://altinn.no/ui/authentication/upgrade?goTo=https%3A%2F%2Fplatform.altinn.no%2Fauthentication%2Fapi%2Fv1%2Fauthentication%3Fgoto%3Dhttps%3A%2F%2Flocal.altinn.cloud%2Fttd%2Ftest&reqAuthLevel=overlord',
        );
      });
    });
    describe('getEnvironmentLoginUrl', () => {
      beforeEach(() => {
        resetWindow();
      });
      it('should return correct url when oidc provider is "idporten" and host has 3 subdomains', () => {
        const oidcProvider = 'idporten';
        expect(getEnvironmentLoginUrl(oidcProvider)).toContain(
          'https://platform.altinn.no/authentication/api/v1/authentication?goto=https%3A%2F%2Fttd.apps.altinn.no%2Fttd%2Ftest&iss=idporten',
        );
      });

      it('should return correct url when oidc provider is "idporten" and host has 4 subdomains', () => {
        const oidcProvider = 'idporten';
        expect(getEnvironmentLoginUrl(oidcProvider)).toEqual(
          'https://platform.altinn.no/authentication/api/v1/authentication?goto=https%3A%2F%2Fttd.apps.altinn.no%2Fttd%2Ftest&iss=idporten',
        );
      });

      it('should return correct url when oidc provider is null', () => {
        const oidcProvider = null;
        expect(getEnvironmentLoginUrl(oidcProvider)).toEqual(
          'https://platform.altinn.no/authentication/api/v1/authentication?goto=https%3A%2F%2Fttd.apps.altinn.no%2Fttd%2Ftest',
        );
      });

      it('should return correct url when oidc provider is ""', () => {
        const oidcProvider = '';
        expect(getEnvironmentLoginUrl(oidcProvider)).toEqual(
          'https://platform.altinn.no/authentication/api/v1/authentication?goto=https%3A%2F%2Fttd.apps.altinn.no%2Fttd%2Ftest',
        );
      });

      it('should throw error when host has too many subdomains', () => {
        const oldWindowLocation = window.location;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).location;
        window.location = {
          ...oldWindowLocation,
          origin: 'https://ttd.apps.altinn.no',
          hash: '#/datamodelling',
          pathname: '/ttd/jesttest/',
          host: 'https://ttd.apps.too.many.domains.altinn.no',
          href: 'https://ttd.apps.altinn.no/ttd/test',
        };
        const oidcProvider = '';

        expect(() => getEnvironmentLoginUrl(oidcProvider)).toThrow('Unknown domain');
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
        mappedData: {
          selectedCountry: 'Norway',
        },
      });

      expect(result).toEqual('https://local.altinn.cloud/ttd/test/api/datalists/country?selectedCountry=Norway');
    });

    it('should render correct url when formData/Mapping, language, pagination and sorting paramters are provided', () => {
      const result = getDataListsUrl({
        dataListId: 'country',
        mappedData: {
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

  describe('getRulehandlerUrl', () => {
    it('should return rule handler as passed argument', () => {
      const result = getRulehandlerUrl('custom-handler.js');

      expect(result).toBe('https://local.altinn.cloud/ttd/test/api/rulehandler/custom-handler.js');
    });
  });

  describe('getLayoutsUrl', () => {
    it('should return layout as passed argument', () => {
      const result = getLayoutsUrl('custom-layout.json');

      expect(result).toBe('https://local.altinn.cloud/ttd/test/api/layouts/custom-layout.json');
    });
  });

  describe('getLayoutSettingsUrl', () => {
    it('should return layout as passed argument', () => {
      const result = getLayoutSettingsUrl('custom-layout.json');

      expect(result).toBe('https://local.altinn.cloud/ttd/test/api/layoutsettings/custom-layout.json');
    });
  });

  describe('getFetchFormDynamicsUrl', () => {
    it('should return layout as passed argument', () => {
      const result = getFetchFormDynamicsUrl('custom-rule.json');

      expect(result).toBe('https://local.altinn.cloud/ttd/test/api/ruleconfiguration/custom-rule.json');
    });
  });
});
