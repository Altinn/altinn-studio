import { MessageBoxConfigEvaluator } from 'src/features/applicationMetadata/messageBoxConfig';

describe('MessageBoxConfigEvaluator', () => {
  describe('isHiddenFromInbox', () => {
    it('should return false when messageBoxConfig is undefined', () => {
      expect(MessageBoxConfigEvaluator.isHiddenFromInbox(undefined)).toBe(false);
    });

    it('should return false when hideSettings is undefined', () => {
      expect(MessageBoxConfigEvaluator.isHiddenFromInbox({})).toBe(false);
    });

    it('should return true when hideAlways is true', () => {
      expect(MessageBoxConfigEvaluator.isHiddenFromInbox({ hideSettings: { hideAlways: true } })).toBe(true);
    });

    it('should return false when hideAlways is false', () => {
      expect(MessageBoxConfigEvaluator.isHiddenFromInbox({ hideSettings: { hideAlways: false } })).toBe(false);
    });
  });
});
