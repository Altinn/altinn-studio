import { renderHook } from '@testing-library/react';
import { useTranslateKeyValue } from './useTranslateKeyValue';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { useComponentPropertyEnumValue, useComponentPropertyLabel } from '../../../hooks';

jest.mock('@altinn/ux-editor/hooks');

describe('useTranslateKeyValue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when no values are provided', () => {
    const { result } = renderHook(() => useTranslateKeyValue(null));
    expect(result.current).toBeUndefined();
  });

  it('should translate and format the values in an array and object correctly', () => {
    (useComponentPropertyEnumValue as jest.Mock).mockReturnValue(
      (value: string) =>
        ({
          value1: textMock('ux_editor.component_properties.enum_value1'),
          value2: textMock('ux_editor.component_properties.enum_value2'),
        })[value] || value,
    );
    (useComponentPropertyLabel as jest.Mock).mockReturnValue((value: string) => value);

    const arrayToBeDisplayed = ['value1', 'value2'];
    const { result } = renderHook(() => useTranslateKeyValue(arrayToBeDisplayed));
    expect(result.current).toBe(
      `${textMock('ux_editor.component_properties.enum_value1')}, ${textMock('ux_editor.component_properties.enum_value2')}`,
    );

    const objectToBeDisplayed = { key1: 'value1', key2: 'value2' };
    const { result: resultObj } = renderHook(() => useTranslateKeyValue(objectToBeDisplayed));
    expect(resultObj.current).toBe(
      `${textMock('ux_editor.component_properties.enum_key1')}: ${textMock('ux_editor.component_properties.enum_value1')}, ${textMock('ux_editor.component_properties.enum_key2')}: ${textMock('ux_editor.component_properties.enum_value2')}`,
    );
  });
});
