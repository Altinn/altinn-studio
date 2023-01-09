import { renderHook } from '@testing-library/react';

import { useDisplayData } from 'src/components/hooks/useDisplayData';

describe('useDisplayData', () => {
  test('should return undefined if formData is undefined', async () => {
    expect(renderHook(() => useDisplayData({ formData: undefined })).result.current).toBeUndefined();
  });

  test('should handle formData as object', async () => {
    const { result } = renderHook(() =>
      useDisplayData({
        formData: {
          value: 'some value in an object',
          value2: 'other value',
        },
      }),
    );
    expect(result.current).toBe('some value in an object other value');
  });
  test('should handle formData as array', async () => {
    const { result } = renderHook(() => useDisplayData({ formData: ['values', 'in', 'an', 'array'] }));
    expect(result.current).toBe('values in an array');
  });

  test('should handle formData as single value', async () => {
    const { result } = renderHook(() => useDisplayData({ formData: 'single value' }));
    expect(result.current).toBe('single value');
  });
});
