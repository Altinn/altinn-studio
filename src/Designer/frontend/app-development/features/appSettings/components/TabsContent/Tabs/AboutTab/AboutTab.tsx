import type { ReactElement } from 'react';
import classes from './AboutTab.module.css';
import { useTranslation } from 'react-i18next';
import {
  StudioCard,
  StudioHeading,
  StudioParagraph,
  StudioValidationMessage,
} from '@studio/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppMetadataQuery } from 'app-shared/hooks/queries';
import { LoadingTabData } from '../../LoadingTabData';
import { TabPageHeader } from '../../TabPageHeader';
import { TabPageWrapper } from '../../TabPageWrapper';
import { TabDataError } from '../../TabDataError';
import { AppConfigForm } from './AppConfigForm';
import { useAppMetadataMutation } from 'app-development/hooks/mutations/useAppMetadataMutation';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';

export function AboutTab(): ReactElement {
  const { t } = useTranslation();

  return (
    <TabPageWrapper hasInlineSpacing={false}>
      <div className={classes.headingWrapper}>
        <TabPageHeader text={t('app_settings.about_tab_heading')} />
      </div>
      <AboutTabContent />
    </TabPageWrapper>
  );
}

function AboutTabContent(): ReactElement {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();

  const { mutate: saveApplicationMetadata } = useAppMetadataMutation(org, app);
  const {
    status: applicationMetadataStatus,
    error: applicationMetadataError,
    data: appMetadata,
  } = useAppMetadataQuery(org, app);

  const setApplicationMetadata = (updatedConfig: ApplicationMetadata) => {
    saveApplicationMetadata(updatedConfig);
  };

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
      return (
        <div className={classes.wrapper}>
          <div>
            <AppConfigForm
              appConfig={appMetadata}
              saveAppConfig={(updatedAppConfig: ApplicationMetadata) =>
                setApplicationMetadata(updatedAppConfig)
              }
            />
          </div>
          <div className={classes.cardContainer}>
            <StudioCard>
              <StudioCard.Block>
                <img
                  src='/img/illustration_about-page.png'
                  alt={t('app_settings.about_tab_image_alt_text')}
                />
              </StudioCard.Block>
              <StudioCard.Block className={classes.cardContent}>
                <StudioHeading level={3}>Hvorfor må du beskrive appen?</StudioHeading>
                <StudioParagraph>
                  Du må beskrive appen du har laget i Altinn Studio for å fortelle tilgangsstyring i
                  Altinn at tjenesten din finnes. Da får appen tilgang til Altinn Autorisasjon, og
                  sluttbrukerne får tilgang til skjema og andre tjenester du lager.
                </StudioParagraph>
                <StudioParagraph>
                  Du beskriver appen på denne siden og beskrivelsen registreres i Altinn
                  (ressursregisteret) når du har publisert appen.
                </StudioParagraph>
              </StudioCard.Block>
            </StudioCard>
          </div>
        </div>
      );
    }
  }
}
