import type React from 'react';
import { type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

export async function testOnClickCallbackReceivesNativeEvent<
  Element extends HTMLElement = HTMLElement,
>(
  renderComponent: (onClick: (event: React.MouseEvent<Element>) => void) => RenderResult,
  getTargetElement: (container: RenderResult['container']) => Element,
): Promise<void> {
  await testNativeClickEvent<Element>(renderComponent, getTargetElement);
}

async function testNativeClickEvent<Element extends HTMLElement>(
  ...[renderComponent, getTargetElement]: Parameters<
    typeof testOnClickCallbackReceivesNativeEvent<Element>
  >
): Promise<void> {
  const user = userEvent.setup();
  const onClickMock = jest.fn();
  const { container, unmount } = renderComponent(onClickMock);

  const targetElement = getTargetElement(container);
  await user.click(targetElement);

  const clickEvent = onClickMock.mock.calls[0][0];
  expect(clickEvent.nativeEvent).toBeInstanceOf(MouseEvent);
  expect(clickEvent.nativeEvent.target).toBe(targetElement);
  expect(clickEvent.nativeEvent.type).toBe('click');

  unmount();
}
