import { useEffect } from 'react';
import { useAppMetadataQuery, useTextResourcesQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { Heading } from '@digdir/designsystemet-react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { StudioSpinner } from '@studio/components';
import { textResourceByLanguageAndIdSelector } from 'app-shared/selectors/textResourceSelectors';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import type { ITextResources } from 'app-shared/types/global';

const APP_NAME_TEXT_RESOURCE_ID = 'appName';

export const Header = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();

  const {
    data: appMetadata,
    isPending: isAppMetadataPending,
    isError: isAppMetadataError,
  } = useAppMetadataQuery(org, app, {
    hideDefaultError: true,
  });

  const { data: textResources, isPending: isTextResourcesPending } = useTextResourcesQuery(
    org,
    app,
  );

  useEffect(() => {
    if (isAppMetadataError) {
      toast.error(t('overview.fetch_title_error_message'));
    }
  }, [isAppMetadataError, t]);

  const title = appMetadata?.title?.[DEFAULT_LANGUAGE];
  const isWaitingForFallbackName = !title && isTextResourcesPending;

  if (isAppMetadataPending || isWaitingForFallbackName) {
    return <StudioSpinner aria-hidden spinnerTitle={t('overview.header_loading')} />;
  }

  return (
    <Heading level={1} size='xlarge'>
      {title || getAppName(textResources) || app}
    </Heading>
  );
};

function getAppName(textResources: ITextResources): string | undefined {
  return textResourceByLanguageAndIdSelector(
    DEFAULT_LANGUAGE,
    APP_NAME_TEXT_RESOURCE_ID,
  )(textResources)?.value;
}
