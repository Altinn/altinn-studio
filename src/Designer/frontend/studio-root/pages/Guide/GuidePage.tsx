import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { useEnvironmentConfig } from 'app-shared/contexts/EnvironmentConfigContext';
import { useUserQuery } from 'app-shared/hooks/queries/useUserQuery';
import { LoginGuide, shouldSkipLoginGuide } from './LoginGuide';

export const GuidePage = (): ReactElement => {
  const { environment } = useEnvironmentConfig();
  const { data: user } = useUserQuery();

  useEffect(() => {
    if (user) {
      window.location.href = '/';
      return;
    }
    if (shouldSkipLoginGuide()) {
      window.location.href = '/login';
    }
  }, [user]);

  if (user || shouldSkipLoginGuide()) {
    return null;
  }

  return <LoginGuide accountLinkUrl={environment?.accountLinkUrl} />;
};
