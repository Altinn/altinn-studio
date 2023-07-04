import { orgs } from 'src/__mocks__/orgs';
import { useIsDev } from 'src/hooks/useIsDev';

const location = window.location;

function mockHostName(host: string) {
  jest.spyOn(window, 'location', 'get').mockReturnValue({ ...location, host });
}

describe('useIsDev', () => {
  beforeEach(() => {
    jest.spyOn(window, 'location', 'get').mockRestore();
  });

  it('should return true if host is local.altinn.cloud', () => {
    mockHostName('local.altinn.cloud');
    expect(window.location.host).toBe('local.altinn.cloud');
    expect(useIsDev()).toBe(true);
  });

  it('should return true if host is dev.altinn.studio', () => {
    mockHostName('dev.altinn.studio');
    expect(window.location.host).toBe('dev.altinn.studio');
    expect(useIsDev()).toBe(true);
  });

  it('should return true if host is altinn.studio', () => {
    mockHostName('altinn.studio');
    expect(window.location.host).toBe('altinn.studio');
    expect(useIsDev()).toBe(true);
  });

  it('should return true if host is studio.localhost', () => {
    mockHostName('studio.localhost');
    expect(window.location.host).toBe('studio.localhost');
    expect(useIsDev()).toBe(true);
  });

  it('should return false if host is altinn3local.no', () => {
    mockHostName('altinn3local.no');
    expect(window.location.host).toBe('altinn3local.no');
    expect(useIsDev()).toBe(false);
  });

  orgs.forEach((org) => {
    it(`should return true if host is ${org}.apps.tt02.altinn.no`, () => {
      mockHostName(`${org}.apps.tt02.altinn.no`);
      expect(window.location.host).toBe(`${org}.apps.tt02.altinn.no`);
      expect(useIsDev()).toBe(true);
    });
  });

  orgs.forEach((org) => {
    it(`should return false if host is ${org}.apps.altinn.no`, () => {
      mockHostName(`${org}.apps.altinn.no`);
      expect(window.location.host).toBe(`${org}.apps.altinn.no`);
      expect(useIsDev()).toBe(false);
    });
  });
});
