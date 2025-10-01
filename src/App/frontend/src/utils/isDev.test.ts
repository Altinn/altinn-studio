import { jest } from '@jest/globals';

import { orgs } from 'src/__mocks__/orgs';
import { isDev } from 'src/utils/isDev';

const location = window.location;

function mockHostName(hostname: string) {
  jest.spyOn(window, 'location', 'get').mockReturnValue({ ...location, hostname });
}

describe('isDev', () => {
  beforeEach(() => {
    jest.spyOn(window, 'location', 'get').mockRestore();
  });

  it('should return true if hostname is local.altinn.cloud', () => {
    mockHostName('local.altinn.cloud');
    expect(window.location.hostname).toBe('local.altinn.cloud');
    expect(isDev()).toBe(true);
  });

  it('should return true if hostname is dev.altinn.studio', () => {
    mockHostName('dev.altinn.studio');
    expect(window.location.hostname).toBe('dev.altinn.studio');
    expect(isDev()).toBe(true);
  });

  it('should return true if hostname is altinn.studio', () => {
    mockHostName('altinn.studio');
    expect(window.location.hostname).toBe('altinn.studio');
    expect(isDev()).toBe(true);
  });

  it('should return true if hostname is studio.localhost', () => {
    mockHostName('studio.localhost');
    expect(window.location.hostname).toBe('studio.localhost');
    expect(isDev()).toBe(true);
  });

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
