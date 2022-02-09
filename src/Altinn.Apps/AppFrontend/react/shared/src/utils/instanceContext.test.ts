import 'jest';
import { IInstanceContext, IInstance } from '../../src/types';
import { buildInstanceContext } from './instanceContext';

describe('>>> src/Altinn.Apps/AppFrontend/react/shared/src/utils/instanceContext.ts', () => {
  const partyId = '1337';
  const appId =  'tdd/enapp';
  const instaceId = `${partyId}/super-secret-uuid-000`;
  const mockInstance: IInstance = {
    id: instaceId,
    appId: appId,
    instanceOwner: {
      partyId: partyId,
    }
  } as IInstance;

  it('+++ should build a valid instance context', () => {
    const expected: IInstanceContext = {
      appId: appId,
      instanceId: instaceId,
      instanceOwnerPartyId: partyId,
    }
    const actual = buildInstanceContext(mockInstance);

    expect(actual).toEqual(expected);
  });

  it('+++ should handle null input gracefully', () => {
    const actual = buildInstanceContext(null);

    expect(actual).toBeNull();
  });

  it('+++ should handle undefined input gracefully', () => {
    const actual = buildInstanceContext(undefined);

    expect(actual).toBeNull();
  });
});
