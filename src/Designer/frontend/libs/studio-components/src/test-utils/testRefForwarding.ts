import type { ForwardedRef, RefObject } from 'react';
import { createRef } from 'react';
import type { RenderResult } from '@testing-library/react';
import { getRootElementFromContainer } from './selectors';

export function testRefForwarding<Element extends HTMLElement = HTMLElement>(
  renderComponent: (ref: ForwardedRef<Element>) => RenderResult,
  getTargetElement: (container: RenderResult['container']) => Element = getRootElementFromContainer,
): void {
  testObjectRefForwarding<Element>(renderComponent, getTargetElement);
  testCallbackRefForwarding<Element>(renderComponent, getTargetElement);
}

function testObjectRefForwarding<Element extends HTMLElement>(
  ...[renderComponent, getTargetElement]: Parameters<typeof testRefForwarding<Element>>
): void {
  const ref: RefObject<Element> = createRef<Element>();
  const { container, unmount } = renderComponent(ref);
  expect(ref.current).toBe(getTargetElement?.(container));
  unmount();
}

function testCallbackRefForwarding<Element extends HTMLElement>(
  ...[renderComponent, getTargetElement]: Parameters<typeof testRefForwarding<Element>>
): void {
  const ref = jest.fn();
  const { container, unmount } = renderComponent(ref);
  expect(ref).toHaveBeenCalledTimes(1);
  expect(ref).toHaveBeenCalledWith(getTargetElement?.(container));
  unmount();
}
