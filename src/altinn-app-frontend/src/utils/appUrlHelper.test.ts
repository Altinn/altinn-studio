import {
  dataElementUrl,
  fileTagUrl,
  fileUploadUrl,
  getCalculatePageOrderUrl,
  getCreateInstancesUrl,
  getDataValidationUrl,
  getEnvironmentLoginUrl,
  getFetchFormDynamicsUrl,
  getHostname,
  getLayoutSettingsUrl,
  getLayoutsUrl,
  getOptionsUrl,
  getProcessNextUrl,
  getProcessStateUrl,
  getRedirectUrl,
  getRulehandlerUrl,
  getStatelessFormDataUrl,
  getUpgradeAuthLevelUrl,
  getValidationUrl,
  redirectToUpgrade,
  textResourcesUrl,
  updateCookieUrl,
  validPartiesUrl,
} from 'src/utils/appUrlHelper';

describe('Frontend urlHelper.ts', () => {
  window['instanceId'] = '12345/instanceId-1234';
  describe('constants', () => {
    it('should return the expected url for validPartiesUrl', () => {
      expect(validPartiesUrl).toBe(
        'https://altinn3local.no/ttd/test/api/v1/parties?allowedtoinstantiatefilter=true',
      );
    });
    it('should return the expected url for updateCookieUrl', () => {
      expect(updateCookieUrl('12345')).toBe(
        'https://altinn3local.no/ttd/test/api/v1/parties/12345',
      );
    });
    it('should return the expected url for textResourcesUrl', () => {
      expect(textResourcesUrl('nb')).toBe(
        'https://altinn3local.no/ttd/test/api/v1/texts/nb',
      );
    });
    it('should return the expected url for fileUploadUrl', () => {
      expect(fileUploadUrl('dataGuid')).toBe(
        'https://altinn3local.no/ttd/test/instances/12345/instanceId-1234/data?dataType=dataGuid',
      );
    });
    it('should return the expected url for fileTagUrl', () => {
      expect(fileTagUrl('dataGuid')).toBe(
        'https://altinn3local.no/ttd/test/instances/12345/instanceId-1234/data/dataGuid/tags',
      );
    });
    it('should return the expected url for dataElementUrl', () => {
      expect(dataElementUrl('dataGuid')).toBe(
        'https://altinn3local.no/ttd/test/instances/12345/instanceId-1234/data/dataGuid',
      );
    });
    it('should return the expected url for getProcessStateUrl', () => {
      expect(getProcessStateUrl()).toBe(
        'https://altinn3local.no/ttd/test/instances/12345/instanceId-1234/process',
      );
    });
    it('should return the expected url for getCreateInstancesUrl', () => {
      expect(getCreateInstancesUrl('12345')).toBe(
        'https://altinn3local.no/ttd/test/instances?instanceOwnerPartyId=12345',
      );
    });
    it('should return the expected url for getValidationUrl', () => {
      expect(getValidationUrl('12345/instanceId-1234')).toBe(
        'https://altinn3local.no/ttd/test/instances/12345/instanceId-1234/validate',
      );
    });
    it('should return the expected url for getDataValidationUrl', () => {
      expect(getDataValidationUrl('12345/instanceId-1234', 'dataGuid')).toBe(
        'https://altinn3local.no/ttd/test/instances/12345/instanceId-1234/data/dataGuid/validate',
      );
    });
    it('should return the expected url for getProcessNextUrl', () => {
      expect(getProcessNextUrl('taskId')).toBe(
        'https://altinn3local.no/ttd/test/instances/12345/instanceId-1234/process/next?elementId=taskId',
      );
      expect(getProcessNextUrl()).toBe(
        'https://altinn3local.no/ttd/test/instances/12345/instanceId-1234/process/next',
      );
    });
    it('should return the expected url for getRedirectUrl', () => {
      expect(getRedirectUrl('http://www.nrk.no')).toBe(
        'https://altinn3local.no/ttd/test/api/v1/redirect?url=http%3A%2F%2Fwww.nrk.no',
      );
    });
    it('should return the expected url for getUpgradeAuthLevelUrl', () => {
      expect(getUpgradeAuthLevelUrl('overlord')).toBe(
        'https://altinn3local.no/ui/authentication/upgrade?goTo=https%3A%2F%2Fplatform.altinn3local.no%2Fauthentication%2Fapi%2Fv1%2Fauthentication%3Fgoto%3Dhttps%3A%2F%2Faltinn3local.no%2Fttd%2Ftest&reqAuthLevel=overlord',
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
      delete window.location;
      window.location = {
        ...oldWindowLocation,
        ...location,
      };
    };
    describe('util', () => {
      it('should return the expected url for getUpgradeAuthLevelUrl', () => {
        resetWindow();
        expect(getUpgradeAuthLevelUrl('overlord')).toBe(
          'https://altinn.no/ui/authentication/upgrade?goTo=https%3A%2F%2Fplatform.altinn.no%2Fauthentication%2Fapi%2Fv1%2Fauthentication%3Fgoto%3Dhttps%3A%2F%2Faltinn3local.no%2Fttd%2Ftest&reqAuthLevel=overlord',
        );
      });
      it('changes the window location', () => {
        resetWindow();
        expect(window.location.href).toBe(
          'https://ttd.apps.altinn.no/ttd/test',
        );
        redirectToUpgrade('overlord');
        expect(window.location.href).toBe(
          'https://altinn.no/ui/authentication/upgrade?goTo=https%3A%2F%2Fplatform.altinn.no%2Fauthentication%2Fapi%2Fv1%2Fauthentication%3Fgoto%3Dhttps%3A%2F%2Faltinn3local.no%2Fttd%2Ftest&reqAuthLevel=overlord',
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
          host: 'altinn3local.no',
        });
        expect(getHostname()).toEqual('altinn3local.no');
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

      expect(result).toEqual(
        'https://altinn3local.no/ttd/test/api/options/county',
      );
    });

    it('should return correct url when language is passed and no formData/dataMapping is provided', () => {
      const result = getOptionsUrl({
        optionsId: 'county',
        language: 'en',
      });

      expect(result).toEqual(
        'https://altinn3local.no/ttd/test/api/options/county?language=en',
      );
    });

    it('should return correct url when no language is passed and formData/dataMapping is provided', () => {
      const result = getOptionsUrl({
        optionsId: 'country',
        formData: {
          country: 'Norway',
        },
        dataMapping: {
          country: 'selectedCountry',
        },
      });

      expect(result).toEqual(
        'https://altinn3local.no/ttd/test/api/options/country?selectedCountry=Norway',
      );
    });

    it('should return correct url when both language is passed and formData/dataMapping is provided', () => {
      const result = getOptionsUrl({
        optionsId: 'country',
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
        'https://altinn3local.no/ttd/test/api/options/country?language=en&selectedCountry=Norway&selectedPostCode=0123',
      );
    });

    it('should return instance aware url when secure param is passed for secure option', () => {
      const result = getOptionsUrl({
        optionsId: 'country',
        language: 'en',
        formData: {
          country: 'Norway',
          postCode: '0123',
        },
        dataMapping: {
          country: 'selectedCountry',
          postCode: 'selectedPostCode',
        },
        secure: true,
        instanceId: 'someInstanceId',
      });

      expect(result).toEqual(
        'https://altinn3local.no/ttd/test/instances/someInstanceId/options/country?language=en&selectedCountry=Norway&selectedPostCode=0123',
      );
    });

    it('should return instance aware url when no language or formData/dataMapping is provided for secure option', () => {
      const result = getOptionsUrl({
        optionsId: 'country',
        secure: true,
        instanceId: 'someInstanceId',
      });

      expect(result).toEqual(
        'https://altinn3local.no/ttd/test/instances/someInstanceId/options/country',
      );
    });
  });

  describe('getRulehandlerUrl', () => {
    it('should return default when no parameter is passed', () => {
      const result = getRulehandlerUrl(null);

      expect(result).toBe(
        'https://altinn3local.no/ttd/test/api/resource/RuleHandler.js',
      );
    });

    it('should return rule handler as passed argument', () => {
      const result = getRulehandlerUrl('custom-handler.js');

      expect(result).toBe(
        'https://altinn3local.no/ttd/test/api/rulehandler/custom-handler.js',
      );
    });
  });

  describe('getCalculatePageOrderUrl', () => {
    it('should return stateful url if stateless is false', () => {
      const result = getCalculatePageOrderUrl(false);

      expect(result).toBe(
        'https://altinn3local.no/ttd/test/instances/12345/instanceId-1234/pages/order',
      );
    });

    it('should return stateless url if stateless is true', () => {
      const result = getCalculatePageOrderUrl(true);

      expect(result).toBe('https://altinn3local.no/ttd/test/v1/pages/order');
    });
  });

  describe('getLayoutsUrl', () => {
    it('should return default when no parameter is passed', () => {
      const result = getLayoutsUrl(null);

      expect(result).toBe(
        'https://altinn3local.no/ttd/test/api/resource/FormLayout.json',
      );
    });

    it('should return layout as passed argument', () => {
      const result = getLayoutsUrl('custom-layout.json');

      expect(result).toBe(
        'https://altinn3local.no/ttd/test/api/layouts/custom-layout.json',
      );
    });
  });

  describe('getLayoutSettingsUrl', () => {
    it('should return default when no parameter is passed', () => {
      const result = getLayoutSettingsUrl(null);

      expect(result).toBe(
        'https://altinn3local.no/ttd/test/api/layoutsettings',
      );
    });

    it('should return layout as passed argument', () => {
      const result = getLayoutSettingsUrl('custom-layout.json');

      expect(result).toBe(
        'https://altinn3local.no/ttd/test/api/layoutsettings/custom-layout.json',
      );
    });
  });

  describe('getFetchFormDynamicsUrl', () => {
    it('should return default when no parameter is passed', () => {
      const nullResult = getFetchFormDynamicsUrl(null);
      const undefinedResult = getFetchFormDynamicsUrl();

      const expected =
        'https://altinn3local.no/ttd/test/api/resource/RuleConfiguration.json';

      expect(nullResult).toBe(expected);
      expect(undefinedResult).toBe(expected);
    });

    it('should return layout as passed argument', () => {
      const result = getFetchFormDynamicsUrl('custom-rule.json');

      expect(result).toBe(
        'https://altinn3local.no/ttd/test/api/ruleconfiguration/custom-rule.json',
      );
    });
  });

  describe('getStatelessFormDataUrl', () => {
    const dataType = 'someDataType';
    it('should return default when only dataType parameter is passed', () => {
      const nullResult = getStatelessFormDataUrl(dataType, null);
      const undefinedResult = getStatelessFormDataUrl(dataType);

      const expected = `https://altinn3local.no/ttd/test/v1/data?dataType=${dataType}`;

      expect(nullResult).toBe(expected);
      expect(undefinedResult).toBe(expected);
    });

    it('should return anonymous url when anonymous is passed as true', () => {
      const trueResult = getStatelessFormDataUrl(dataType, true);
      const expected = `https://altinn3local.no/ttd/test/v1/data/anonymous?dataType=${dataType}`;
      expect(trueResult).toBe(expected);
    });

    it('should return default url when anonymous is passed as false', () => {
      const trueResult = getStatelessFormDataUrl(dataType, false);
      const expected = `https://altinn3local.no/ttd/test/v1/data?dataType=${dataType}`;
      expect(trueResult).toBe(expected);
    });
  });
});
