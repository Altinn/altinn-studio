import { act, renderHook } from '@testing-library/react';
import { type UseUniqueKeyArgs, useUniqueKey } from 'app-shared/hooks/useUniqueKey';

describe('useUniqueKey', () => {
  it('should generate unique keys within a max number range', () => {
    const { result } = renderHook(() => useUniqueKey({ maxNumberOfIds: 2 }));

    const firstItem = result.current.getUniqueKey(0);
    const secondItem = result.current.getUniqueKey(1);

    expect(result.current.getUniqueKey(0)).toEqual(firstItem);
    expect(result.current.getUniqueKey(1)).toEqual(secondItem);
    expect(result.current.getUniqueKey(1)).not.toEqual(firstItem);
  });

  it('should delete id when "removeKey" is called', () => {
    const { result, rerender } = renderHook((props: UseUniqueKeyArgs) =>
      useUniqueKey({ maxNumberOfIds: props?.maxNumberOfIds || 3 }),
    );

    const thirdItem = result.current.getUniqueKey(2);
    expect(thirdItem).toBe(result.current.getUniqueKey(2));

    act(() => {
      result.current.removeKey(2);
    });

    rerender({ maxNumberOfIds: 2 });

    expect(result.current.getUniqueKey(2)).toEqual(undefined);
  });
});
