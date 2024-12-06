import { renderHook } from '@testing-library/react';
import { useComponentPropertyDescription } from './useComponentPropertyDescription';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

const somePropertyName = 'somePropertyName';
const customTextMockToHandleUndefined = (
  keys: string | string[],
  variables?: KeyValuePairs<string>,
) => {
  const key = Array.isArray(keys) ? keys[0] : keys;
  if (key === `ux_editor.component_properties_description.${somePropertyName}`) return key;
  return variables
    ? '[mockedText(' + key + ', ' + JSON.stringify(variables) + ')]'
    : '[mockedText(' + key + ')]';
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: customTextMockToHandleUndefined,
  }),
}));

describe('useComponentPropertyDescription', () => {
  it('Returns a function that returns the description', () => {
    const result = renderHook(() => useComponentPropertyDescription()).result.current;
    const propertyDescription = result('testDescription');
    expect(propertyDescription).toEqual(
      textMock('ux_editor.component_properties_description.testDescription'),
    );
  });
  it('Returns a function that returns undefined if there was no text key for the description', () => {
    const result = renderHook(() => useComponentPropertyDescription()).result.current;
    const propertyDescription = result(somePropertyName);
    expect(propertyDescription).toEqual(undefined);
  });
});
