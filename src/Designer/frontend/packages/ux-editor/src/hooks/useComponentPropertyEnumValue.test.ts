import { renderHook } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { useComponentPropertyEnumValue } from '@altinn/ux-editor/hooks/useComponentPropertyEnumValue';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

const enumValueWithoutText = 'enumValueWithoutText';
const customTextMockToHandleUndefined = (
  keys: string | string[],
  variables?: KeyValuePairs<string>,
) => {
  const key = Array.isArray(keys) ? keys[0] : keys;
  if (key === `ux_editor.component_properties.enum_${enumValueWithoutText}`) return key;
  return variables
    ? '[mockedText(' + key + ', ' + JSON.stringify(variables) + ')]'
    : '[mockedText(' + key + ')]';
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: customTextMockToHandleUndefined,
  }),
}));

describe('useComponentPropertyEnumValue', () => {
  it('Returns a function that returns the enum value', () => {
    const result = renderHook(() => useComponentPropertyEnumValue()).result.current;
    const propertyEnumValue = result('testEnumValue');
    expect(propertyEnumValue).toEqual(
      textMock('ux_editor.component_properties.enum_testEnumValue'),
    );
  });
  it('Returns a function that returns the enum value if there was no text key for the description', () => {
    const result = renderHook(() => useComponentPropertyEnumValue()).result.current;
    const propertyEnumValue = result(enumValueWithoutText);
    expect(propertyEnumValue).toEqual(enumValueWithoutText);
  });
});
