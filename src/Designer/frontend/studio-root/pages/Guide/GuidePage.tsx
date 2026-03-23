import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { useEnvironmentConfig } from 'app-shared/contexts/EnvironmentConfigContext';
import { LoginGuide, shouldSkipLoginGuide } from './LoginGuide';

export const GuidePage = (): ReactElement => {
  const { environment } = useEnvironmentConfig();

  useEffect(() => {
    if (shouldSkipLoginGuide()) {
      window.location.href = '/login';
    }
  }, []);

  if (shouldSkipLoginGuide()) {
    return null;
  }

  return <LoginGuide accountLinkUrl={environment?.accountLinkUrl} />;
};
