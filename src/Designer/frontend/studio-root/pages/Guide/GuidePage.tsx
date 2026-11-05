import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { get } from 'app-shared/utils/networking';
import { useEnvironmentConfig } from 'app-shared/contexts/EnvironmentConfigContext';
import { LoginGuide, shouldSkipLoginGuide } from './LoginGuide';

export const GuidePage = (): ReactElement => {
  const { environment } = useEnvironmentConfig();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (shouldSkipLoginGuide()) {
      window.location.href = '/login';
      return;
    }

    // Using get directly instead of useUserQuery to avoid ServicesContextProvider's
    // global 401 error handler, which would trigger a logout toast on this unauthenticated page.
    get('/designer/api/user/current')
      .then(() => {
        window.location.href = '/';
      })
      .catch(() => setChecked(true));
  }, []);

  if (!checked) {
    return null;
  }

  return <LoginGuide accountLinkUrl={environment?.accountLinkUrl} />;
};
