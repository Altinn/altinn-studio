import { useRef, type ReactElement } from 'react';
import classes from './AboutTab.module.css';
import { useTranslation } from 'react-i18next';
import { StudioValidationMessage } from '@studio/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppMetadataQuery } from 'app-shared/hooks/queries';
import { LoadingTabData } from '../../LoadingTabData';
import { TabPageHeader } from '../../TabPageHeader';
import { TabPageWrapper } from '../../TabPageWrapper';
import { TabDataError } from '../../TabDataError';
import { AppConfigForm } from './AppConfigForm';
import { useAppMetadataMutation } from 'app-development/hooks/mutations/useAppMetadataMutation';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { Infobox } from './Infobox/Infobox';
import { VersionedAppConfigForm } from './VersionedAppConfigForm';

export function AboutTab(): ReactElement {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();

  return (
    <TabPageWrapper hasInlineSpacing={false}>
      <div className={classes.headingWrapper}>
        <TabPageHeader text={t('app_settings.about_tab_heading')} />
      </div>
      <AboutTabContent key={`${org}/${app}`} />
    </TabPageWrapper>
  );
}

function AboutTabContent(): ReactElement {
  const { org, app } = useStudioEnvironmentParams();

  const { mutate: saveApplicationMetadata } = useAppMetadataMutation(org, app);
  const {
    status: applicationMetadataStatus,
    error: applicationMetadataError,
    data: appMetadata,
    isFetching: isFetchingAppMetadata,
    refetch: refetchAppMetadata,
  } = useAppMetadataQuery(org, app);

  const setApplicationMetadata = (updatedConfig: ApplicationMetadata) => {
    saveApplicationMetadata(updatedConfig);
  };

  // Wait for the mount refetch before capturing a draft. Keep the form mounted if a later refetch fails.
  const isVersionedFormShown = useRef(false);
  if (
    !isVersionedFormShown.current &&
    appMetadata?.revision &&
    applicationMetadataStatus === 'success' &&
    !isFetchingAppMetadata
  ) {
    isVersionedFormShown.current = true;
  }

  if (isVersionedFormShown.current) {
    return (
      <div className={classes.wrapper}>
        <VersionedAppConfigForm
          key={`${org}/${app}`}
          initialMetadata={appMetadata}
          reload={async () => (await refetchAppMetadata({ throwOnError: true })).data}
        />
        <Infobox />
      </div>
    );
  }

  switch (applicationMetadataStatus) {
    case 'pending': {
      return <LoadingTabData />;
    }
    case 'error': {
      return (
        <TabDataError>
          {applicationMetadataError && (
            <StudioValidationMessage>{applicationMetadataError.message}</StudioValidationMessage>
          )}
        </TabDataError>
      );
    }
    case 'success': {
      if (appMetadata.revision) {
        return <LoadingTabData />; // The cached metadata is being refetched.
      }
      return (
        <div className={classes.wrapper}>
          <AppConfigForm
            appConfig={appMetadata}
            saveAppConfig={(updatedAppConfig: ApplicationMetadata) =>
              setApplicationMetadata(updatedAppConfig)
            }
          />
          <Infobox />
        </div>
      );
    }
  }
}
