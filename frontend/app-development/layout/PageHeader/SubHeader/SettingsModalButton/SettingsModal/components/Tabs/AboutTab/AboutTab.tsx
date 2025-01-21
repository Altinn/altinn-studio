import React from 'react';
import { useTranslation } from 'react-i18next';
import { TabHeader } from '../../TabHeader';
import { ErrorMessage } from '@digdir/designsystemet-react';
import { getRepositoryType } from 'app-shared/utils/repository';
import { useAppMetadataQuery, useRepoMetadataQuery } from 'app-shared/hooks/queries';
import { mergeQueryStatuses } from 'app-shared/utils/tanstackQueryUtils';
import { LoadingTabData } from '../../LoadingTabData';
import { TabDataError } from '../../TabDataError';
import { InputFields } from './InputFields';
import { CreatedFor } from './CreatedFor';
import { TabContent } from '../../TabContent';
import { usePreviewContext } from '../../../../../../../../contexts/PreviewContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { ServiceNames } from './InputFields/InputFields';
import { RecommendedLanguageFlags } from './InputFields/InputFields';
import { useUpdateAppTitle } from '../../../hooks/useUpdateAppTitle';
import { useLanguagesQuery } from '../../../../../../../../hooks/queries';
import { ArrayUtils } from '@studio/pure-functions';

export const AboutTab = (): React.ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const repositoryType = getRepositoryType(org, app);

  const { doReloadPreview } = usePreviewContext();

  const {
    status: appLangCodesStatus,
    data: appLangCodesData,
    error: appLangCodesError,
  } = useLanguagesQuery(org, app);
  const {
    status: repositoryStatus,
    data: repositoryData,
    error: repositoryError,
  } = useRepoMetadataQuery(org, app);
  const {
    status: applicationMetadataStatus,
    data: applicationMetadataData,
    error: applicationMetadataError,
  } = useAppMetadataQuery(org, app);

  const updateAppTitle = useUpdateAppTitle(applicationMetadataData);

  const handleSaveServiceName = (serviceName: string, language: string) => {
    if (applicationMetadataData.title[language] !== serviceName) {
      doReloadPreview();
    }
    updateAppTitle(language, serviceName);
  };

  const displayContent = () => {
    switch (mergeQueryStatuses(appLangCodesStatus, repositoryStatus, applicationMetadataStatus)) {
      case 'pending': {
        return <LoadingTabData />;
      }
      case 'error': {
        return (
          <TabDataError>
            {appLangCodesError && <ErrorMessage>{appLangCodesError.message}</ErrorMessage>}
            {repositoryError && <ErrorMessage>{repositoryError.message}</ErrorMessage>}
            {applicationMetadataError && (
              <ErrorMessage>{applicationMetadataError.message}</ErrorMessage>
            )}
          </TabDataError>
        );
      }
      case 'success': {
        const appTitles: ServiceNames<(typeof appLangCodesData)[number]> = getAppTitlesToDisplay(
          applicationMetadataData.title,
          appLangCodesData,
        );
        return (
          <>
            <InputFields
              appLangCodes={appLangCodesData}
              onSave={handleSaveServiceName}
              repositoryName={repositoryData.name}
              serviceNames={appTitles}
            />
            <CreatedFor
              repositoryType={repositoryType}
              repository={repositoryData}
              authorName={applicationMetadataData?.createdBy}
            />
          </>
        );
      }
    }
  };
  return (
    <TabContent>
      <TabHeader text={t('settings_modal.about_tab_heading')} />
      {displayContent()}
    </TabContent>
  );
};

export const getAppTitlesToDisplay = (
  appMetadataTitles: ServiceNames<(typeof appLangCodesData)[number]>,
  appLangCodesData: string[],
): ServiceNames<(typeof appLangCodesData)[number]> => {
  const recommendedLanguages: string[] = Object.keys(RecommendedLanguageFlags);
  const appLangCodesIncludingRecommended: string[] = ArrayUtils.removeDuplicates(
    recommendedLanguages.concat(Object.keys(appMetadataTitles)).concat(appLangCodesData),
  );
  return Object.fromEntries(
    appLangCodesIncludingRecommended.map((lang) => [lang, appMetadataTitles[lang]]),
  );
};
