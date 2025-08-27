import React from 'react';
import classes from './MigrationPage.module.css';
import { useResourcePolicyPublishStatusQuery } from '../../hooks/queries';
import {
  StudioHeading,
  StudioParagraph,
  StudioSpinner,
  StudioLabelAsParagraph,
  StudioLink,
} from 'libs/studio-components-legacy/src';
import { useTranslation } from 'react-i18next';
import { useUrlParams } from '../../hooks/useUrlParams';
import { getAvailableEnvironments } from '../../utils/resourceUtils';
import { MigrationPanel } from '../../components/MigrationPanel';
import { altinnDocsUrl } from 'app-shared/ext-urls';

export type MigrationPageProps = {
  id: string;
  serviceCode: string;
  serviceEdition: string;
};

/**
 * @component
 *    Page that shows the information about migrating from Altinn 2 to Altinn 3
 *
 * @property {string}[id] - The id of the page
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const MigrationPage = ({
  id,
  serviceCode,
  serviceEdition,
}: MigrationPageProps): React.JSX.Element => {
  const { t } = useTranslation();

  const { org, app, resourceId } = useUrlParams();

  const { isPending: isLoadingPublishStatus, data: publishStatusData } =
    useResourcePolicyPublishStatusQuery(org, app, resourceId);

  const envPublishStatus = getAvailableEnvironments(org).map((env) => {
    const isPublishedInEnv = publishStatusData?.publishedVersions.some(
      (version) => version.environment === env.id && version.version,
    );
    return {
      ...env,
      isResourcePublished: isPublishedInEnv,
    };
  });

  /**
   * Display the content on the page
   */
  const displayContent = () => {
    if (isLoadingPublishStatus) {
      return (
        <div>
          <StudioSpinner
            size='xl'
            variant='interaction'
            spinnerTitle={t('resourceadm.loading_migration_status')}
          />
        </div>
      );
    }
    return (
      <>
        <StudioHeading size='lg' spacing level={1}>
          {t('resourceadm.migration_header')}
        </StudioHeading>
        <div className={classes.contentWrapper}>
          <StudioParagraph size='sm' spacing>
            {t('resourceadm.migration_ingress')}{' '}
            <strong>{t('resourceadm.migration_ingress_warning')} </strong>
            <StudioLink
              className={classes.migrationLink}
              href={altinnDocsUrl({
                relativeUrl:
                  'authorization/what-do-you-get/resourceregistry/migration/#migrering-av-rettigheter',
              })}
              rel='noopener noreferrer'
              target='_blank'
            >
              {t('resourceadm.migration_help_link')}
            </StudioLink>
          </StudioParagraph>
          <div className={classes.contentDivider} />
          <StudioLabelAsParagraph size='md' spacing htmlFor='selectEnvDropdown'>
            {t('resourceadm.migration_select_environment_header')}
          </StudioLabelAsParagraph>
          <StudioParagraph size='sm'>
            {t('resourceadm.migration_select_environment_body')}
          </StudioParagraph>
          <div className={classes.environmentWrapper}>
            {envPublishStatus.map((env) => {
              const isPublishedInEnv = env.isResourcePublished;
              return (
                <MigrationPanel
                  key={env.id}
                  serviceCode={serviceCode}
                  serviceEdition={serviceEdition}
                  env={env}
                  isPublishedInEnv={isPublishedInEnv}
                />
              );
            })}
          </div>
        </div>
      </>
    );
  };

  return (
    <div className={classes.pageWrapper} id={id} role='tabpanel'>
      {displayContent()}
    </div>
  );
};
