import { buildInstanceDataSources } from 'src/utils/instanceDataSources';
import type { IInstance, IInstanceDataSources } from 'src/types/shared';

describe('instanceDataSources/instanceContext', () => {
  it('should build a valid instance context', () => {
    const partyId = '1337';
    const appId = 'tdd/enapp';
    const instaceId = `${partyId}/super-secret-uuid-000`;
    const mockInstance: IInstance = {
      id: instaceId,
      appId,
      instanceOwner: {
        partyId,
      },
    } as IInstance;

    const expected: IInstanceDataSources = {
      appId,
      instanceId: instaceId,
      instanceOwnerPartyId: partyId,
      instanceOwnerPartyType: 'unknown',
    };
    const actual = buildInstanceDataSources(mockInstance);

    expect(actual).toEqual(expected);
  });

  it('should handle null input gracefully', () => {
    const actual = buildInstanceDataSources(null);

    expect(actual).toBeNull();
  });

  it('should handle undefined input gracefully', () => {
    const actual = buildInstanceDataSources(undefined);

    expect(actual).toBeNull();
  });
});
