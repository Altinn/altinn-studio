import type React from 'react';
import { fireEvent, type RenderResult } from '@testing-library/react';

export function testOnClickCallbackReceivesNativeEvent<Element extends HTMLElement = HTMLElement>(
  renderComponent: (onClick: (event: React.MouseEvent<Element>) => void) => RenderResult,
  getTargetElement: (container: RenderResult['container']) => Element,
): void {
  testNativeClickEvent<Element>(renderComponent, getTargetElement);
}

function testNativeClickEvent<Element extends HTMLElement>(
  ...[renderComponent, getTargetElement]: Parameters<
    typeof testOnClickCallbackReceivesNativeEvent<Element>
  >
): void {
  const onClickMock = jest.fn();
  const { container, unmount } = renderComponent(onClickMock);

  const targetElement = getTargetElement(container);
  fireEvent.click(targetElement);

  const clickEvent = onClickMock.mock.calls[0][0];
  expect(clickEvent.nativeEvent).toBeInstanceOf(MouseEvent);
  expect(clickEvent.nativeEvent.target).toBe(targetElement);
  expect(clickEvent.nativeEvent.type).toBe('click');

  unmount();
}
