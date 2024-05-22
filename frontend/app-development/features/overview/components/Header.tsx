import React, { useEffect } from 'react';
import { useAppConfigQuery } from 'app-development/hooks/queries';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { Heading } from '@digdir/design-system-react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { StudioSpinner } from '@studio/components';

export const Header = () => {
  const { org, app } = useStudioUrlParams();

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
    return <StudioSpinner showSpinnerTitle={false} spinnerTitle={t('overview.header_loading')} />;
  }

  return (
    <Heading level={1} size='xlarge'>
      {appConfigData?.serviceName || app}
    </Heading>
  );
};
