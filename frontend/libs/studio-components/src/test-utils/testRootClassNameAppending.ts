import type { RenderResult } from '@testing-library/react';
import { getRootElementFromContainer } from './selectors';

export function testRootClassNameAppending(
  renderComponent: (className?: string) => RenderResult,
): void {
  const className = 'test-class';
  const { container: defaultContainer } = renderComponent();
  const defaultClasses: string[] = getRootClasses(defaultContainer);
  const { container: containerWithCLass } = renderComponent(className);
  const rootElement: HTMLElement = getRootElementFromContainer(containerWithCLass);
  defaultClasses.filter(Boolean).forEach((defaultClass) => {
    expect(rootElement).toHaveClass(defaultClass);
  });
  expect(rootElement).toHaveClass(className);
}

function getRootClasses(container: RenderResult['container']): string[] {
  const rootElement: HTMLElement = getRootElementFromContainer(container);
  const className = rootElement.className;
  return classListFromClassName(className);
}

function classListFromClassName(className: string | SVGAnimatedString): string[] {
  const stringClassName = classNameToString(className);
  return classListFromString(stringClassName);
}

function classNameToString(className: string | SVGAnimatedString): string {
  return typeof className === 'string' ? className : className.baseVal;
}

function classListFromString(className: string): string[] {
  return className.trim().split(/\s+/);
}
