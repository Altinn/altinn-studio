import { isAxiosError } from 'src/utils/isAxiosError';
import { putWithoutConfig } from 'src/utils/network/networking';
import { invalidateCookieUrl, redirectToUpgrade } from 'src/utils/urls/appUrlHelper';

/**
 * A 403 carrying a `RequiredAuthenticationLevel` means the user is authenticated, but with a too low security level.
 * This is a synchronous guard so the render path can block further rendering (showing a loader) instead of flashing a
 * generic "missing roles" error page while the asynchronous step-up redirect is in flight.
 */
export function isAuthenticationRedirectError(error: unknown): boolean {
  return !!(
    isAxiosError(error) &&
    error.response?.status === 403 &&
    error.response.data &&
    error.response.data['RequiredAuthenticationLevel']
  );
}

/**
 * Kills the existing (too-low-level) auth cookie so the platform auth endpoint cannot short-circuit on the stale
 * session and bounce us back at the same level. With no cookie it must go to ID-porten, which, together with the
 * acr_values requirement on the redirect URL, forces a real step-up. Never throws: a failed invalidation must not
 * block the redirect.
 */
async function invalidateExistingAuthCookie(): Promise<void> {
  try {
    await putWithoutConfig(invalidateCookieUrl);
  } catch (e) {
    window.logError('Failed to invalidate auth cookie before step-up redirect:\n', e);
  }
}
export async function maybeAuthenticationRedirect(error: unknown): Promise<boolean> {
  if (isAuthenticationRedirectError(error)) {
    await invalidateExistingAuthCookie();
    redirectToUpgrade();

    return true;
  }

  return false;
}
