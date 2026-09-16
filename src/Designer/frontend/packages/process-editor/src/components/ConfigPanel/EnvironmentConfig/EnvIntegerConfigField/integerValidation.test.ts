import { getIntegerValueErrorKey } from './integerValidation';

const errorKey = 'process_editor.configuration_panel.environment_config.integer_error';
const rangeErrorKey = 'process_editor.configuration_panel.environment_config.integer_range_error';

describe('getIntegerValueErrorKey', () => {
  // `+3` is one of the two values where a plainer rule than `int.TryParse` would disagree with the
  // runtime: the app boots on it, so the panel must not call it missing.
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
    'rejects %p, which the runtime would fail to parse at boot',
    (value) => {
      expect(getIntegerValueErrorKey(value)).toBe(errorKey);
    },
  );

  // The other edge: all digits, so it looks like a whole number, but `int.TryParse` overflows on it
  // and the app does not start. Saying "write a whole number" here would be answering the wrong
  // question.
  it.each(['2147483648', '-2147483649', '99999999999999999999'])(
    'rejects %p, which is a whole number the runtime cannot hold',
    (value) => {
      expect(getIntegerValueErrorKey(value)).toBe(rangeErrorKey);
    },
  );
});
