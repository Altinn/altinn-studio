import { getIntegerValueErrorKey } from './integerValidation';

const errorKey = 'process_editor.configuration_panel.environment_config.integer_error';

describe('getIntegerValueErrorKey', () => {
  it.each(['3', '-1', '0', ' 3 '])('accepts the whole number %p', (value) => {
    expect(getIntegerValueErrorKey(value)).toBeUndefined();
  });

  it('accepts an empty value, which the field turns into a deleted entry', () => {
    expect(getIntegerValueErrorKey('')).toBeUndefined();
  });

  it.each(['3.5', '3e2', '3,5', 'three', '3 4'])(
    'rejects %p, which the runtime would fail to parse at boot',
    (value) => {
      expect(getIntegerValueErrorKey(value)).toBe(errorKey);
    },
  );
});
