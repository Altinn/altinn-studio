import type { ReactNode, RefObject } from 'react';
import { createRef } from 'react';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';

export function verifyRefForwarding<Element extends HTMLElement = HTMLElement>(
  component: (ref: RefObject<Element>) => ReactNode,
  getElement: () => Element,
): void {
  const ref: RefObject<Element> = createRef<Element>();
  render(component(ref));
  expect(ref.current).toBe(getElement());
}
