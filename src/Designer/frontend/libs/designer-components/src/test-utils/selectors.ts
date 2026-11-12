import type { RenderResult } from '@testing-library/react';

export function getRootElementFromContainer<Element extends HTMLElement = HTMLElement>(
  container: RenderResult['container'],
): Element {
  return container.children.item(0) as Element;
}

export function getFirstBySelector<Element extends HTMLElement = HTMLElement>(
  container: RenderResult['container'],
  selector: string,
): Element {
  return container.querySelector(selector) as Element;
}
