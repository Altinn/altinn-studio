import React, { useEffect } from 'react';
import { useAppConfigQuery } from 'app-development/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { Heading } from '@digdir/designsystemet-react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { StudioSpinner } from '@studio/components';
import { StarButton } from './StarButton';
import classes from './Header.module.css';

export const Header = () => {
  const { org, app } = useStudioEnvironmentParams();

  const {
    data: appConfigData,
    isPending,
    isError,
  } = useAppConfigQuery(org, app, {
    hideDefaultError: true,
  });
  const { t } = useTranslation();

  useEffect(() => {
    if (isError) {
      toast.error(t('overview.fetch_title_error_message'));
    }
  }, [isError, t]);

  if (isPending) {
    return <StudioSpinner aria-hidden spinnerTitle={t('overview.header_loading')} />;
  }

  return (
    <div className={classes.headerContainer}>
      <Heading level={1} size='xlarge'>
        {appConfigData?.serviceName || app}
      </Heading>
      <StarButton org={org} app={app} appName={appConfigData?.serviceName} />
    </div>
  );
};
