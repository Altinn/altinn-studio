import type { RenderResult } from '@testing-library/react';
import { act, render } from '@testing-library/react';
import { studioTest } from './studioTest';

export function renderAndRunTimers(...args: Parameters<typeof render>): RenderResult {
  return studioTest.runWithFakeTimers(() => {
    const view = render(...args);
    act(() => studioTest.runAllTimers());
    return view;
  });
}
