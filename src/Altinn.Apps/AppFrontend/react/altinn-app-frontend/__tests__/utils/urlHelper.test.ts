import {
  getEnvironmentLoginUrl,
  getOptionsUrl,
} from '../../src/utils/urlHelper';

describe('Frontend urlHelper.ts', () => {
  describe('getEnvironmentLoginUrl', () => {
    test('should return correct containing oidc provider', () => {
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

    test('should return correct not containing oidc provider', () => {
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

    test('should return correct not containing oidc provider', () => {
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
});
