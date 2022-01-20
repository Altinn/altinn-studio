import 'jest';
import { getEnvironmentLoginUrl } from '../../src/utils/urlHelper';

describe('Frontend urlHelper.ts', () => {
  test('getEnvironmentLoginUrl() should return correct containing oidc provider', () => {
    const oldWindowLocation = window.location;
    delete window.location;
    window.location = {
      ...oldWindowLocation,
      origin: 'https://ttd.apps.altinn.no',
      hash: '#/datamodelling',
      pathname: '/ttd/jesttest/',
      host: 'https://ttd.apps.altinn.no',
      href: 'https://ttd.apps.altinn.no/ttd/test'
    };
    const oidcProvider = 'idporten';
    expect(getEnvironmentLoginUrl(oidcProvider)).toContain('https://platform.altinn.no/authentication/api/v1/authentication?goto=https%3A%2F%2Fttd.apps.altinn.no%2Fttd%2Ftest&iss=idporten');
  });

  test('getEnvironmentLoginUrl() should return correct not containing oidc provider', () => {
    const oldWindowLocation = window.location;
    delete window.location;
    window.location = {
      ...oldWindowLocation,
      origin: 'https://ttd.apps.altinn.no',
      hash: '#/datamodelling',
      pathname: '/ttd/jesttest/',
      host: 'https://ttd.apps.altinn.no',
      href: 'https://ttd.apps.altinn.no/ttd/test'
    };
    const oidcProvider = null;
    expect(getEnvironmentLoginUrl(oidcProvider)).toEqual('https://platform.altinn.no/authentication/api/v1/authentication?goto=https%3A%2F%2Fttd.apps.altinn.no%2Fttd%2Ftest');
  });

  test('getEnvironmentLoginUrl() should return correct not containing oidc provider', () => {
    const oldWindowLocation = window.location;
    delete window.location;
    window.location = {
      ...oldWindowLocation,
      origin: 'https://ttd.apps.altinn.no',
      hash: '#/datamodelling',
      pathname: '/ttd/jesttest/',
      host: 'https://ttd.apps.altinn.no',
      href: 'https://ttd.apps.altinn.no/ttd/test'
    };
    const oidcProvider = '';
    expect(getEnvironmentLoginUrl(oidcProvider)).toEqual('https://platform.altinn.no/authentication/api/v1/authentication?goto=https%3A%2F%2Fttd.apps.altinn.no%2Fttd%2Ftest');
  });
});  

