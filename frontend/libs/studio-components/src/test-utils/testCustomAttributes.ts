import type { RenderResult } from '@testing-library/react';
import { getRootElementFromContainer } from './selectors';
import type { HTMLAttributes } from 'react';

type CustomAttributes = {
  [key: `data-${string}`]: string;
};

export function testCustomAttributes<
  Element extends HTMLElement = HTMLElement,
  Props extends {} = HTMLAttributes<Element>,
>(
  renderComponent: (customAttributes: Props) => RenderResult,
  getTargetElement: (container: RenderResult['container']) => Element = getRootElementFromContainer,
): void {
  const customAttributes: Props = {
    'data-test-attribute-1': 'test-1',
    'data-test-attribute-2': 'test-2',
  } satisfies CustomAttributes as unknown as Props;
  const { container } = renderComponent(customAttributes);
  const targetElement: Element = getTargetElement(container);
  Object.entries(customAttributes).forEach(([key, value]) => {
    expect(targetElement).toHaveAttribute(key, value);
  });
}
