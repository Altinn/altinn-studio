import type { AxiosError } from 'axios';

import { putWithoutConfig } from 'src/utils/network/networking';
import { invalidateCookieUrl, redirectToUpgrade } from 'src/utils/urls/appUrlHelper';

export async function maybeAuthenticationRedirect(error: AxiosError): Promise<boolean> {
  if (error.response && error.response.status === 403 && error.response.data) {
    const reqAuthLevel = error.response.data['RequiredAuthenticationLevel'];
    if (reqAuthLevel) {
      await putWithoutConfig(invalidateCookieUrl);
      redirectToUpgrade(reqAuthLevel);

      return true;
    }
  }

  return false;
}
