import { getInstanceId, getInstanceOwnerId, getArchiveRef } from './instance';

import { mockLocation } from 'testConfig/testUtils';

const originalLocation = window.location;

// instanceId and instanceOwnerId are set in package.json under "jest.testURL"
describe('utils/instance', () => {
  beforeEach(() => {
    mockLocation(originalLocation);
  });
  describe('getInstanceId', () => {
    it('should return instanceOwnerId when it exists in url', () => {
      expect(getInstanceId()).toEqual('6697de17-18c7-4fb9-a428-d6a414a797ae');
    });

    it('should return empty string when window.location.pathname is not set', () => {
      mockLocation({ pathname: undefined });
      expect(getInstanceId()).toEqual('');
    });
  });

  describe('getInstanceOwnerId', () => {
    it('should return instanceOwnerId when it exists in url', () => {
      expect(getInstanceOwnerId()).toEqual('mockInstanceOwnerId');
    });

    it('should return empty string when window.location.pathname is not set', () => {
      mockLocation({ pathname: undefined });
      expect(getInstanceOwnerId()).toEqual('');
    });
  });

  describe('getArchiveRef', () => {
    it('should return last part of instanceId', () => {
      expect(getArchiveRef()).toEqual('d6a414a797ae');
    });

    it('should return undefined when no instanceId is set', () => {
      mockLocation({ pathname: undefined });

      expect(getArchiveRef()).toEqual(undefined);
    });
  });
});
