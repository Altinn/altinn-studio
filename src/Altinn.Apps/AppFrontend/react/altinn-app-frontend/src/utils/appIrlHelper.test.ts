import {
  getEnvironmentLoginUrl,
  getOptionsUrl,
  getRulehandlerUrl,
  getLayoutsUrl,
  getFetchFormDynamicsUrl,
  getLayoutSettingsUrl,
  getHostname,
} from './appUrlHelper';

describe('Frontend urlHelper.ts', () => {
  describe('getEnvironmentLoginUrl', () => {
    test('should return correct url when oidc provider is "idporten" and host has 3 subdomains', () => {
      const oldWindowLocation = window.location;
      delete window.location;
      window.location = {
        ...oldWindowLocation,
        origin: 'https://ttd.apps.altinn.no',
        hash: '#/datamodelling',
        pathname: '/ttd/jesttest/',
        host: 'https://ttd.apps.altinn.no',
        href: 'https://ttd.apps.altinn.no/ttd/test',
      };
      const oidcProvider = 'idporten';
      expect(getEnvironmentLoginUrl(oidcProvider)).toContain(
        'https://platform.altinn.no/authentication/api/v1/authentication?goto=https%3A%2F%2Fttd.apps.altinn.no%2Fttd%2Ftest&iss=idporten',
      );
    });

    test('should return correct url when oidc provider is "idporten" and host has 4 subdomains', () => {
      const oldWindowLocation = window.location;
      delete window.location;
      window.location = {
        ...oldWindowLocation,
        origin: 'https://ttd.apps.altinn.no',
        hash: '#/datamodelling',
        pathname: '/ttd/jesttest/',
        host: 'https://ttd.apps.test.altinn.no',
        href: 'https://ttd.apps.altinn.no/ttd/test',
      };
      const oidcProvider = 'idporten';
      expect(getEnvironmentLoginUrl(oidcProvider)).toEqual(
        'https://platform.test.altinn.no/authentication/api/v1/authentication?goto=https%3A%2F%2Fttd.apps.altinn.no%2Fttd%2Ftest&iss=idporten',
      );
    });

    test('should return correct url when oidc provider is null', () => {
      const oldWindowLocation = window.location;
      delete window.location;
      window.location = {
        ...oldWindowLocation,
        origin: 'https://ttd.apps.altinn.no',
        hash: '#/datamodelling',
        pathname: '/ttd/jesttest/',
        host: 'https://ttd.apps.altinn.no',
        href: 'https://ttd.apps.altinn.no/ttd/test',
      };
      const oidcProvider = null;
      expect(getEnvironmentLoginUrl(oidcProvider)).toEqual(
        'https://platform.altinn.no/authentication/api/v1/authentication?goto=https%3A%2F%2Fttd.apps.altinn.no%2Fttd%2Ftest',
      );
    });

    test('should return correct url when oidc provider is ""', () => {
      const oldWindowLocation = window.location;
      delete window.location;
      window.location = {
        ...oldWindowLocation,
        origin: 'https://ttd.apps.altinn.no',
        hash: '#/datamodelling',
        pathname: '/ttd/jesttest/',
        host: 'https://ttd.apps.altinn.no',
        href: 'https://ttd.apps.altinn.no/ttd/test',
      };
      const oidcProvider = '';
      expect(getEnvironmentLoginUrl(oidcProvider)).toEqual(
        'https://platform.altinn.no/authentication/api/v1/authentication?goto=https%3A%2F%2Fttd.apps.altinn.no%2Fttd%2Ftest',
      );
    });

    test('should throw error when host has too many subdomains', () => {
      const oldWindowLocation = window.location;
      delete window.location;
      window.location = {
        ...oldWindowLocation,
        origin: 'https://ttd.apps.altinn.no',
        hash: '#/datamodelling',
        pathname: '/ttd/jesttest/',
        host: 'https://ttd.apps.too.many.domains.altinn.no',
        href: 'https://ttd.apps.altinn.no/ttd/test',
      };
      const oidcProvider = '';

      expect(() => getEnvironmentLoginUrl(oidcProvider)).toThrow(
        'Unknown domain',
      );
    });
  });

  describe('getHostname', () => {
    test('should return correct hostname when host has 5 domain parts', () => {
      const oldWindowLocation = window.location;
      delete window.location;
      window.location = {
        ...oldWindowLocation,
        host: 'my.ttd.apps.altinn.no',
      };

      expect(getHostname()).toEqual('apps.altinn.no');
    });

    test('should return correct hostname when host has 4 domain parts', () => {
      const oldWindowLocation = window.location;
      delete window.location;
      window.location = {
        ...oldWindowLocation,
        host: 'ttd.apps.altinn.no',
      };

      expect(getHostname()).toEqual('altinn.no');
    });

    test('should return correct hostname when host has 2 domain parts, and the first part is "altinn3local"', () => {
      const oldWindowLocation = window.location;
      delete window.location;
      window.location = {
        ...oldWindowLocation,
        host: 'altinn3local.no',
      };

      expect(getHostname()).toEqual('altinn3local.no');
    });

    test('should throw error when hostname has 3 parts', () => {
      const oldWindowLocation = window.location;
      delete window.location;
      window.location = {
        ...oldWindowLocation,
        host: 'apps.altinn.no',
      };

      expect(getHostname).toThrow('Unknown domain');
    });

    test('should throw error when hostname has too many parts', () => {
      const oldWindowLocation = window.location;
      delete window.location;
      window.location = {
        ...oldWindowLocation,
        host: 'too.many.host.parts.altinn.no',
      };

      expect(getHostname).toThrow('Unknown domain');
    });
  });

  describe('getOptionsUrl', () => {
    test('should return correct url when no language or formData/dataMapping is provided', () => {
      const result = getOptionsUrl({
        optionsId: 'county',
      });

      expect(result).toEqual(
        'https://altinn3local.no/ttd/test/api/options/county',
      );
    });

    test('should return correct url when language is passed and no formData/dataMapping is provided', () => {
      const result = getOptionsUrl({
        optionsId: 'county',
        language: 'en',
      });

      expect(result).toEqual(
        'https://altinn3local.no/ttd/test/api/options/county?language=en',
      );
    });

    test('should return correct url when no language is passed and formData/dataMapping is provided', () => {
      const result = getOptionsUrl({
        optionsId: 'county',
        formData: {
          country: 'Norway',
        },
        dataMapping: {
          country: 'selectedCountry',
        },
      });

      expect(result).toEqual(
        'https://altinn3local.no/ttd/test/api/options/county?selectedCountry=Norway',
      );
    });

    test('should return correct url when both language is passed and formData/dataMapping is provided', () => {
      const result = getOptionsUrl({
        optionsId: 'county',
        language: 'en',
        formData: {
          country: 'Norway',
          postCode: '0123',
        },
        dataMapping: {
          country: 'selectedCountry',
          postCode: 'selectedPostCode',
        },
      });

      expect(result).toEqual(
        'https://altinn3local.no/ttd/test/api/options/county?language=en&selectedCountry=Norway&selectedPostCode=0123',
      );
    });
  });

  describe('getRulehandlerUrl', () => {
    test('should return default when no parameter is passed', () => {
      const result = getRulehandlerUrl(null);

      expect(result).toBe(
        'https://altinn3local.no/ttd/test/api/resource/RuleHandler.js',
      );
    });

    test('should return rule handler as passed argument', () => {
      const result = getRulehandlerUrl('custom-handler.js');

      expect(result).toBe(
        'https://altinn3local.no/ttd/test/api/rulehandler/custom-handler.js',
      );
    });
  });

  describe('getLayoutsUrl', () => {
    test('should return default when no parameter is passed', () => {
      const result = getLayoutsUrl(null);

      expect(result).toBe(
        'https://altinn3local.no/ttd/test/api/resource/FormLayout.json',
      );
    });

    test('should return layout as passed argument', () => {
      const result = getLayoutsUrl('custom-layout.json');

      expect(result).toBe(
        'https://altinn3local.no/ttd/test/api/layouts/custom-layout.json',
      );
    });
  });

  describe('getLayoutSettingsUrl', () => {
    test('should return default when no parameter is passed', () => {
      const result = getLayoutSettingsUrl(null);

      expect(result).toBe(
        'https://altinn3local.no/ttd/test/api/layoutsettings',
      );
    });

    test('should return layout as passed argument', () => {
      const result = getLayoutSettingsUrl('custom-layout.json');

      expect(result).toBe(
        'https://altinn3local.no/ttd/test/api/layoutsettings/custom-layout.json',
      );
    });
  });

  describe('getFetchFormDynamicsUrl', () => {
    test('should return default when no parameter is passed', () => {
      const nullResult = getFetchFormDynamicsUrl(null);
      const undefinedResult = getFetchFormDynamicsUrl(undefined);

      const expected =
        'https://altinn3local.no/ttd/test/api/resource/RuleConfiguration.json';

      expect(nullResult).toBe(expected);
      expect(undefinedResult).toBe(expected);
    });

    test('should return layout as passed argument', () => {
      const result = getFetchFormDynamicsUrl('custom-rule.json');

      expect(result).toBe(
        'https://altinn3local.no/ttd/test/api/ruleconfiguration/custom-rule.json',
      );
    });
  });
});
