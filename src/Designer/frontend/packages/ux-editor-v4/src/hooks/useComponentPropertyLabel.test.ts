import { renderHook } from '@testing-library/react';
import { useComponentPropertyLabel } from './useComponentPropertyLabel';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('useComponentPropertyLabel', () => {
  it('Returns a function that returns the property name', () => {
    const result = renderHook(() => useComponentPropertyLabel()).result.current;
    const propertyLabel = result('testProperty');
    expect(propertyLabel).toEqual(textMock('ux_editor.component_properties.testProperty'));
  });

  it('maps timeStamp to the v4-specific translation key', () => {
    const result = renderHook(() => useComponentPropertyLabel()).result.current;
    expect(result('timeStamp')).toEqual(textMock('ux_editor.component_properties.timeStamp_v4'));
  });
});
