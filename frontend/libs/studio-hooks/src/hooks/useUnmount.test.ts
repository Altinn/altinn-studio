import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { useUnmount } from './useUnmount';

describe('useUnmount', () => {
  it('Does not call the function on first render', () => {
    const fun = jest.fn();
    renderUseUnmount(fun);
    expect(fun).not.toHaveBeenCalled();
  });

  it('Does not call the function on rerender', () => {
    const fun = jest.fn();
    const { rerender } = renderUseUnmount(fun);
    rerender({ fun });
    expect(fun).not.toHaveBeenCalled();
  });

  it('Calls the function on unmount', () => {
    const fun = jest.fn();
    const { unmount } = renderUseUnmount(fun);
    unmount();
    expect(fun).toHaveBeenCalledTimes(1);
  });

  it('Calls the most recent function on unmount when it has rendered with different functions', () => {
    const firstFun = jest.fn();
    const secondFun = jest.fn();
    const { rerender, unmount } = renderUseUnmount(firstFun);
    rerender({ fun: secondFun });
    unmount();
    expect(firstFun).not.toHaveBeenCalled();
    expect(secondFun).toHaveBeenCalledTimes(1);
  });
});

type RenderUseUnmountProps = {
  fun: () => void;
};

function renderUseUnmount(fun: () => void): RenderHookResult<void, RenderUseUnmountProps> {
  const props: RenderUseUnmountProps = { fun };
  return renderHook<void, RenderUseUnmountProps>((props) => useUnmount(props.fun), {
    initialProps: props,
  });
}
