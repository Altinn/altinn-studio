import { buildInstanceContext } from 'src/utils/instanceContext';
import type { IInstance, IInstanceContext } from 'src/types/shared';

describe('instanceContext', () => {
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

    const expected: IInstanceContext = {
      appId,
      instanceId: instaceId,
      instanceOwnerPartyId: partyId,
      instanceOwnerPartyType: 'unknown',
    };
    const actual = buildInstanceContext(mockInstance);

    expect(actual).toEqual(expected);
  });

  it('should handle null input gracefully', () => {
    const actual = buildInstanceContext(null);

    expect(actual).toBeNull();
  });

  it('should handle undefined input gracefully', () => {
    const actual = buildInstanceContext(undefined);

    expect(actual).toBeNull();
  });
});
