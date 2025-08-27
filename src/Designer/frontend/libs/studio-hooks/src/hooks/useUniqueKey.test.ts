import { renderHook } from '@testing-library/react';
import {
  type UseUniqueKeyArgs,
  useUniqueKeys,
} from '../../../../../../libs/studio-hooks/src/hooks/useUniqueKeys';

describe('useUniqueKey', () => {
  it('should generate unique keys within a max number range', () => {
    const { result } = renderHook(() => useUniqueKeys({ numberOfKeys: 2 }));

    const firstItem = result.current.getUniqueKey(0);
    const secondItem = result.current.getUniqueKey(1);

    expect(result.current.getUniqueKey(0)).toEqual(firstItem);
    expect(result.current.getUniqueKey(1)).toEqual(secondItem);
    expect(result.current.getUniqueKey(1)).not.toEqual(firstItem);
    expect(result.current.getUniqueKey(2)).toBeUndefined();
  });

  it('should delete id when "removeKey" is called', () => {
    const { result } = renderHook((props: UseUniqueKeyArgs) => useUniqueKeys({ numberOfKeys: 3 }));

    const thirdItem = result.current.getUniqueKey(2);
    expect(thirdItem).toBe(result.current.getUniqueKey(2));

    result.current.removeUniqueKey(2);

    expect(result.current.getUniqueKey(2)).toBeUndefined();
  });

  it('should add unique keys when "addKey" is called', () => {
    const { result } = renderHook((props: UseUniqueKeyArgs) => useUniqueKeys({ numberOfKeys: 1 }));

    expect(result.current.getUniqueKey(1)).toBeUndefined();

    result.current.addUniqueKey();
    expect(result.current.getUniqueKey(1)).toBeDefined();
  });
});
