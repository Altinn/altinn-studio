import { renderHook } from '@testing-library/react';
import { useDisplayObjectValues } from './useDisplayObjectValues';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { useComponentPropertyLabel } from '@altinn/ux-editor/hooks';

jest.mock('@altinn/ux-editor/hooks/useComponentPropertyLabel');

describe('useDisplayObjectValues', () => {
  it('should return null when no values are provided', () => {
    const { result } = renderHook(() => useDisplayObjectValues());
    expect(result.current).toBeNull();
  });

  it('should translate and format object values correctly', () => {
    (useComponentPropertyLabel as jest.Mock).mockReturnValue(
      (value: string) =>
        ({
          value1: textMock('ux_editor.component_properties.value1'),
          value2: 'value2',
          value3: textMock('ux_editor.component_properties.enum_value3'),
        })[value] || value,
    );

    const valuesToBeSaved = {
      key1: 'value1',
      key2: 'value2',
      key3: 'value3',
    };
    const { result } = renderHook(() => useDisplayObjectValues(valuesToBeSaved));
    expect(result.current).toBe(
      `${textMock('ux_editor.component_properties.value1')}, value2, ${textMock('ux_editor.component_properties.enum_value3')}`,
    );
  });
});
