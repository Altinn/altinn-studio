import 'jest';
import { getInstanceId, getInstanceOwnerId } from '../../src/utils/instance';

describe('>>> utils/instance.test.tsx', () => {
  // instanceId and instanceOwnerId are set in package.json under "jest"
  it('should return correct instanceOwnerId', () => {
    expect(getInstanceId()).toEqual('mockInstanceId');
  });

  it('should return correct instanceId', () => {
    expect(getInstanceOwnerId()).toEqual('mockInstanceOwnerId');
  });
});
