import { renderHook } from '@testing-library/react';
import { useComponentPropertyHelpText } from './useComponentPropertyHelpText';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

const somePropertyName = 'undefinedKey';

const customTextMockToHandleUndefined = (
  keys: string | string[],
  variables?: KeyValuePairs<string>,
) => {
  const key = Array.isArray(keys) ? keys[0] : keys;
  if (key === `ux_editor.component_properties_help_text.${somePropertyName}`) return key;
  return variables
    ? '[mockedText(' + key + ', ' + JSON.stringify(variables) + ')]'
    : '[mockedText(' + key + ')]';
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: customTextMockToHandleUndefined,
  }),
}));

describe('useComponentPropertyHelpText', () => {
  it('Returns a function that returns the help text', () => {
    const result = renderHook(() => useComponentPropertyHelpText()).result.current;
    const propertyHelpText = result('test');
    expect(propertyHelpText).toEqual(textMock('ux_editor.component_properties_help_text.test'));
  });

  it('Returns a function that returns undefined if there was no text key for the help text', () => {
    const result = renderHook(() => useComponentPropertyHelpText()).result.current;
    const propertyHelpText = result(somePropertyName);
    expect(propertyHelpText).toEqual(undefined);
  });
});
