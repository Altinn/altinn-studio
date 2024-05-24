import { renderHook } from '@testing-library/react';
import { useComponentPropertyLabel } from './useComponentPropertyLabel';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('useComponentPropertyLabel', () => {
  it('Returns a function that returns the property name', () => {
    const result = renderHook(() => useComponentPropertyLabel()).result.current;
    const propertyLabel = result('testProperty');
    expect(propertyLabel).toEqual(textMock('ux_editor.component_properties.testProperty'));
  });
});
