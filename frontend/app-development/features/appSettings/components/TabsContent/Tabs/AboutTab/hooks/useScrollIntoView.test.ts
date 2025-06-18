import { renderHook } from '@testing-library/react';
import { useScrollIntoView } from './useScrollIntoView';
import type { MutableRefObject } from 'react';

describe('useScrollIntoView', () => {
  it('should call scrollIntoView when condition is true and ref is valid', () => {
    const scrollIntoView = jest.fn();
    const ref = {
      current: { scrollIntoView },
    } as unknown as MutableRefObject<HTMLDivElement>;

    renderUseScrollIntoView(true, ref);

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
      inline: 'start',
    });
  });

  it('should not call scrollIntoView when condition is false', () => {
    const scrollIntoView = jest.fn();
    const ref = {
      current: { scrollIntoView },
    } as unknown as MutableRefObject<HTMLDivElement>;

    renderUseScrollIntoView(false, ref);

    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});

function renderUseScrollIntoView(scrollCondition: boolean, ref: MutableRefObject<HTMLDivElement>) {
  return renderHook(() => useScrollIntoView(scrollCondition, ref));
}
