import { getIntegerValueErrorKey } from './integerValidation';

const errorKey = 'process_editor.configuration_panel.environment_config.integer_error';
const rangeErrorKey = 'process_editor.configuration_panel.environment_config.integer_range_error';

describe('getIntegerValueErrorKey', () => {
  it.each(['3', '-1', '0', ' 3 ', '+3', '2147483647', '-2147483648'])(
    'accepts the whole number %p',
    (value) => {
      expect(getIntegerValueErrorKey(value)).toBeUndefined();
    },
  );

  it('accepts an empty value, which the field turns into a deleted entry', () => {
    expect(getIntegerValueErrorKey('')).toBeUndefined();
  });

  it.each(['3.5', '3e2', '3,5', 'three', '3 4', '- 3', '3-'])(
    'rejects %p, which int.TryParse would fail on',
    (value) => {
      expect(getIntegerValueErrorKey(value)).toBe(errorKey);
    },
  );

  it.each(['2147483648', '-2147483649', '99999999999999999999'])(
    'rejects %p, which is a whole number outside the int range',
    (value) => {
      expect(getIntegerValueErrorKey(value)).toBe(rangeErrorKey);
    },
  );
});
