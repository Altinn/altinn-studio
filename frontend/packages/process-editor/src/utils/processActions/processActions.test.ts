import { getPredefinedActions, isActionAvailable, isActionRequiredForTask } from './processActions';

describe('processActionsUtils', () => {
  describe('getPredefinedActions', () => {
    it('should return predefined actions for signing', () => {
      const result = getPredefinedActions('signing');
      expect(result).toEqual(['write', 'reject', 'confirm', 'sign']);
    });

    it('should return predefined actions for payment', () => {
      const result = getPredefinedActions('payment');
      expect(result).toEqual(['write', 'reject', 'confirm', 'pay']);
    });

    it('should return predefined actions for confirmation', () => {
      const result = getPredefinedActions('confirmation');
      expect(result).toEqual(['write', 'reject', 'confirm']);
    });

    it('should return predefined actions for task', () => {
      const result = getPredefinedActions('data');
      expect(result).toEqual(['write', 'reject', 'confirm']);
    });
  });

  describe('isActionRequiredForTask', () => {
    it('should return true for sign action for signing task', () => {
      const result = isActionRequiredForTask('sign', 'signing');
      expect(result).toEqual(true);
    });

    it('should return true for reject action for signing task', () => {
      const result = isActionRequiredForTask('reject', 'signing');
      expect(result).toEqual(true);
    });

    it('should return true for pay action for payment task', () => {
      const result = isActionRequiredForTask('pay', 'payment');
      expect(result).toEqual(true);
    });

    it('should return true for confirm action for payment task', () => {
      const result = isActionRequiredForTask('confirm', 'payment');
      expect(result).toEqual(true);
    });

    it('should return true for reject action for payment task', () => {
      const result = isActionRequiredForTask('reject', 'payment');
      expect(result).toEqual(true);
    });

    it('should return true for confirm action for confirmation task', () => {
      const result = isActionRequiredForTask('confirm', 'confirmation');
      expect(result).toEqual(true);
    });
  });

  describe('isActionAvailable', () => {
    it('should return true if action is not available', () => {
      const existingActionElements = [{ action: 'write' }];
      const result = isActionAvailable('reject', existingActionElements);
      expect(result).toEqual(true);
    });

    it('should return false if action is available', () => {
      const existingActionElements = [{ action: 'write' }];
      const result = isActionAvailable('write', existingActionElements);
      expect(result).toEqual(false);
    });
  });
});
