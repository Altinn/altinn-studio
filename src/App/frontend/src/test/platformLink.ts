import { fireEvent } from '@testing-library/react';

import { platformLinkNotConfiguredMessage } from 'src/components/PlatformLink/PlatformLink';
import type { PlatformLinkSetting } from 'src/components/PlatformLink/PlatformLink';

/** A configured platform link: a plain link to the URL. */
export function expectConfiguredPlatformLink(link: HTMLElement, href: string) {
  expect(link).toHaveAttribute('href', href);
  expect(link).not.toHaveAttribute('aria-disabled');
}

/**
 * A platform link whose URL is not configured: still rendered, marked as not working, and a click alerts with the
 * missing setting's name instead of navigating.
 */
export function expectNotConfiguredPlatformLink(link: HTMLElement, setting: PlatformLinkSetting) {
  const message = platformLinkNotConfiguredMessage(setting);
  expect(link).toHaveAttribute('aria-disabled', 'true');
  expect(link).toHaveAttribute('title', message);

  const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
  const navigated = fireEvent.click(link);
  expect(navigated).toBe(false);
  expect(alert).toHaveBeenCalledWith(message);
  alert.mockRestore();
}
