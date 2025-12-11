import { renderHook } from '@testing-library/react';
import { useDisplayObjectValues } from './useDisplayObjectValues';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('useDisplayObjectValues', () => {
  it('should return null when no values are provided', () => {
    const { result } = renderHook(() => useDisplayObjectValues());
    expect(result.current).toBeNull();
  });

  it('should translate and format object values correctly', () => {
    const valuesToBeSaved = {
      key1: 'value1',
      key2: 'value2',
    };
    const { result } = renderHook(() => useDisplayObjectValues(valuesToBeSaved));

    expect(result.current).toBe(
      `${textMock('ux_editor.component_properties.value1')}, ${textMock('ux_editor.component_properties.value2')}`,
    );
  });
});
