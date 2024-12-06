// Test data
import type { Option } from 'app-shared/types/Option';
import { getOptionListValueType } from '@altinn/ux-editor/components/config/editModal/EditOptions/OptionTabs/EditOptionList/utils/optionUtils';

const optionListWithStringValue: Option[] = [
  {
    value: 'test-value',
    label: 'test-label',
  },
];

const optionListWithNumberValue: Option[] = [
  {
    value: 123,
    label: 'test-label',
  },
];

const optionListWithBooleanValue: Option[] = [
  {
    value: true,
    label: 'test-label',
  },
];

const optionListWithUndefinedValue: Option[] = [
  {
    value: undefined,
    label: 'test-label',
  },
];

describe('getOptionListValueType', () => {
  it("should return string when the first option's value is a string", () => {
    const result = getOptionListValueType(optionListWithStringValue);
    expect(result).toBe('string');
  });

  it("should return number when the first option's value is a number", () => {
    const result = getOptionListValueType(optionListWithNumberValue);
    expect(result).toBe('number');
  });

  it("should return boolean when the first option's value is a boolean", () => {
    const result = getOptionListValueType(optionListWithBooleanValue);
    expect(result).toBe('boolean');
  });

  it("should throw an error when the first option's value is not supported", () => {
    expect(() => getOptionListValueType(optionListWithUndefinedValue)).toThrow();
  });
});
