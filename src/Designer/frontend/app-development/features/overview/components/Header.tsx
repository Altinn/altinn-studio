import { useEffect } from 'react';
import { useAppMetadataQuery, useTextResourcesQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { StudioSpinner, StudioHeading } from '@studio/components';
import { textResourceByLanguageAndIdSelector } from 'app-shared/selectors/textResourceSelectors';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import type { ITextResources } from 'app-shared/types/global';

const APP_NAME_TEXT_RESOURCE_ID = 'appName';

export const Header = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();

  // These use isLoading rather than isPending because a disabled query stays pending
  // indefinitely, which would leave the spinner in place forever.
  const {
    data: appMetadata,
    isLoading: isAppMetadataLoading,
    isError: isAppMetadataError,
  } = useAppMetadataQuery(org, app, {
    hideDefaultError: true,
  });

  const { data: textResources, isLoading: isTextResourcesLoading } = useTextResourcesQuery(
    org,
    app,
  );

  useEffect(() => {
    if (isAppMetadataError) {
      toast.error(t('overview.fetch_title_error_message'));
    }
  }, [isAppMetadataError, t]);

  const title = appMetadata?.title?.[DEFAULT_LANGUAGE];
  const isWaitingForFallbackName = !title && isTextResourcesLoading;

  if (isAppMetadataLoading || isWaitingForFallbackName) {
    return <StudioSpinner aria-hidden spinnerTitle={t('overview.header_loading')} />;
  }

  return (
    <StudioHeading level={1} data-size='xl'>
      {title || getAppName(textResources) || app}
    </StudioHeading>
  );
};

function getAppName(textResources: ITextResources): string | undefined {
  return textResourceByLanguageAndIdSelector(
    DEFAULT_LANGUAGE,
    APP_NAME_TEXT_RESOURCE_ID,
  )(textResources)?.value;
}
