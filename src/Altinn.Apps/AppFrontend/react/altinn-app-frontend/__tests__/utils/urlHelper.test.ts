import 'jest';
import { getEnvironmentLoginUrl } from '../../src/utils/urlHelper';

  test('getEnvironmentLoginUrl() should return correct containing oidc provider', () => {
    const oldWindowLocation = window.location;
    delete window.location;
    window.location = {
      ...oldWindowLocation,
      origin: 'https://ttd.apps.altinn.no',
      hash: '#/datamodelling',
      pathname: '/ttd/jesttest/',
    };
    const oidcProvider = 'idporten';
    expect(getEnvironmentLoginUrl(oidcProvider)).toContain('altinn.no/ui/authentication/LogOut');
  });
});
