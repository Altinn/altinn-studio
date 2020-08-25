import 'jest';
import { getInstanceId, getInstanceOwnerId } from '../../src/utils/instance';

describe('>>> utils/instance.test.tsx', () => {
  // instanceId and instanceOwnerId are set in package.json under "jest"
  it('should return correct instanceOwnerId', () => {
    expect(getInstanceId()).toEqual('6697de17-18c7-4fb9-a428-d6a414a797ae');
  });

  it('should return correct instanceId', () => {
    expect(getInstanceOwnerId()).toEqual('mockInstanceOwnerId');
  });
});
