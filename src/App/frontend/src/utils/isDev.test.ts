import { vi } from 'vitest';

import { orgs } from 'src/__mocks__/orgs';
import { isDev } from 'src/utils/isDev';

const location = window.location;

function mockHostName(hostname: string) {
  vi.spyOn(window, 'location', 'get').mockReturnValue({ ...location, hostname });
}

function mockDevelopmentSetting(development: boolean) {
  window.altinnAppGlobalData.platformFrontendSettings = {
    ...window.altinnAppGlobalData.platformFrontendSettings,
    development,
  };
}

describe('isDev', () => {
  beforeEach(() => {
    vi.spyOn(window, 'location', 'get').mockRestore();
  });

  it('should return true if hostname is local.altinn.cloud', () => {
    mockHostName('local.altinn.cloud');
    expect(window.location.hostname).toBe('local.altinn.cloud');
    expect(isDev()).toBe(true);
  });

  it('should return true if the platform settings say so, whatever the hostname', () => {
    mockHostName('ttd.apps.altinn.no');
    mockDevelopmentSetting(true);
    expect(isDev()).toBe(true);
  });

  it('should return false if the platform settings say so, whatever the hostname', () => {
    mockHostName('local.altinn.cloud');
    mockDevelopmentSetting(false);
    expect(isDev()).toBe(false);
  });

  // Studio's preview runs on a domain of its own, and its page says it is a development environment.
  it.each(['dev.altinn.studio', 'altinn.studio', 'studio.localhost'])(
    'should return false if hostname is %s, without the platform setting',
    (hostname) => {
      mockHostName(hostname);
      expect(isDev()).toBe(false);
    },
  );

  it('should return false if hostname is altinn3local.no', () => {
    mockHostName('altinn3local.no');
    expect(window.location.hostname).toBe('altinn3local.no');
    expect(isDev()).toBe(false);
  });

  orgs.forEach((org) => {
    it(`should return true if hostname is ${org}.apps.tt02.altinn.no`, () => {
      mockHostName(`${org}.apps.tt02.altinn.no`);
      expect(window.location.hostname).toBe(`${org}.apps.tt02.altinn.no`);
      expect(isDev()).toBe(true);
    });
  });

  orgs.forEach((org) => {
    it(`should return false if hostname is ${org}.apps.altinn.no`, () => {
      mockHostName(`${org}.apps.altinn.no`);
      expect(window.location.hostname).toBe(`${org}.apps.altinn.no`);
      expect(isDev()).toBe(false);
    });
  });
});
