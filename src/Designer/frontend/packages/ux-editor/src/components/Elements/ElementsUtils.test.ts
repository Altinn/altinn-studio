import { ElementsUtils } from './ElementsUtils';

const defaultConfigurationMock = {
  selectedLayoutIsCustomReceipt: false,
  processTaskType: '',
  selectedLayoutSetType: '',
};

describe('ElementsUtils', () => {
  describe('getConfigurationMode', () => {
    it('should return "receipt" when selectedLayoutIsCustomReceipt is true', () => {
      const result = ElementsUtils.getConfigurationMode({
        ...defaultConfigurationMock,
        selectedLayoutIsCustomReceipt: true,
      });
      expect(result).toBe('receipt');
    });

    it('should return "payment" when processTaskType is "payment"', () => {
      const result = ElementsUtils.getConfigurationMode({
        ...defaultConfigurationMock,
        processTaskType: 'payment',
      });
      expect(result).toBe('payment');
    });

    it('should return "subform" when selectedLayoutSetType is "subform"', () => {
      const result = ElementsUtils.getConfigurationMode({
        ...defaultConfigurationMock,
        selectedLayoutSetType: 'subform',
      });
      expect(result).toBe('subform');
    });

    it('should return undefined when no conditions are met', () => {
      const result = ElementsUtils.getConfigurationMode({
        ...defaultConfigurationMock,
      });
      expect(result).toBeUndefined();
    });
  });
});
