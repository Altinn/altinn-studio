import { useChecksum } from './useChecksum';
import { renderHook } from '@testing-library/react';

describe('useChecksum', () => {
  it('should increment checksum when shouldCreateNewChecksum is true', async () => {
    const { result, rerender } = renderHook(
      ({ shouldCreateNewChecksum }) => useChecksum(shouldCreateNewChecksum),
      {
        initialProps: { shouldCreateNewChecksum: false },
      },
    );
    expect(result.current).toBe(0);

    rerender({ shouldCreateNewChecksum: true });
    expect(result.current).toBe(1);
  });

  it('should not change checksum when shouldCreateNewChecksum is false', () => {
    const { result, rerender } = renderHook(
      ({ shouldCreateNewChecksum }) => useChecksum(shouldCreateNewChecksum),
      {
        initialProps: { shouldCreateNewChecksum: false },
      },
    );

    expect(result.current).toBe(0);

    rerender({ shouldCreateNewChecksum: false });
    expect(result.current).toBe(0);
  });
});
