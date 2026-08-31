import { ElementsUtils } from './ElementsUtils';
import {
  confOnScreenComponents,
  paymentLayoutComponents,
  subformLayoutComponents,
} from '../../data/formItemConfig';

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

  describe('getAvailableComponentList', () => {
    it.each([
      ['receipt', confOnScreenComponents],
      ['payment', paymentLayoutComponents],
      ['subform', subformLayoutComponents],
    ] as const)(
      'should return the component list for confPageType "%s"',
      (confPageType, expected) => {
        expect(ElementsUtils.getAvailableComponentList(confPageType)).toEqual(expected);
      },
    );
  });

  describe('getAllowedComponentTypes', () => {
    it('should return undefined when confPageType is undefined', () => {
      expect(ElementsUtils.getAllowedComponentTypes(undefined)).toBeUndefined();
    });

    it('should return the allowed component types for the given confPageType', () => {
      expect(ElementsUtils.getAllowedComponentTypes('receipt')).toEqual(
        confOnScreenComponents.map((component) => component.name),
      );
    });
  });
});
