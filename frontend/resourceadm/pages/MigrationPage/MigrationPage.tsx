import React from 'react';
import classes from './MigrationPage.module.css';
import {
  useResourcePolicyPublishStatusQuery,
  useValidatePolicyQuery,
  useValidateResourceQuery,
} from '../../hooks/queries';
import { MigrationStep } from '../../components/MigrationStep';
import { Heading, Paragraph, Spinner, Label, Link, Accordion } from '@digdir/designsystemet-react';
import type { NavigationBarPage } from '../../types/NavigationBarPage';
import { useTranslation } from 'react-i18next';
import { useUrlParams } from '../../hooks/useUrlParams';
import { getAvailableEnvironments } from '../../utils/resourceUtils';
import { MigrationPanel } from '../../components/MigrationPanel';

export type MigrationPageProps = {
  navigateToPageWithError: (page: NavigationBarPage) => void;
  id: string;
  serviceCode: string;
  serviceEdition: string;
};

/**
 * @component
 *    Page that shows the information about migrating from Altinn 2 to Altinn 3
 *
 * @property {function}[navigateToPageWithError] - Function that navigates to a page with errors
 * @property {string}[id] - The id of the page
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const MigrationPage = ({
  navigateToPageWithError,
  id,
  serviceCode,
  serviceEdition,
}: MigrationPageProps): React.JSX.Element => {
  const { t } = useTranslation();

  const { org, app, resourceId } = useUrlParams();

  const { data: validatePolicyData, isPending: isValidatePolicyPending } = useValidatePolicyQuery(
    org,
    app,
    resourceId,
  );
  const { data: validateResourceData, isPending: validateResourceLoading } =
    useValidateResourceQuery(org, app, resourceId);
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
  const deployOK = envPublishStatus.some((x) => x.isResourcePublished);

  /**
   * Display the content on the page
   */
  const displayContent = () => {
    if (isValidatePolicyPending || validateResourceLoading || isLoadingPublishStatus) {
      return (
        <div>
          <Spinner size='xlarge' variant='interaction' title='Laster inn migreringsstatus' />
        </div>
      );
    }
    return (
      <>
        <Heading size='large' spacing level={1}>
          {t('resourceadm.migration_header')}
        </Heading>
        <div className={classes.contentWrapper}>
          <Paragraph size='small' spacing>
            {t('resourceadm.migration_ingress')}{' '}
            <Link
              className={classes.migrationLink}
              href='https://docs.altinn.studio/authorization/modules/resourceregistry/'
              rel='noopener noreferrer'
              target='_blank'
            >
              {t('resourceadm.migration_help_link')}
            </Link>
          </Paragraph>
          <MigrationStep
            title={t('resourceadm.migration_step_about_resource_header')}
            text={
              validateResourceData.status === 200
                ? 'resourceadm.migration_ready_for_migration'
                : 'resourceadm.migration_step_about_resource_errors'
            }
            translationValues={{ validationErrors: validateResourceData.errors.length }}
            onNavigateToPageWithError={() => navigateToPageWithError('about')}
            isSuccess={validateResourceData.status === 200}
          />
          <MigrationStep
            title={t('resourceadm.migration_step_access_rules_header')}
            text={
              validatePolicyData.status === 404
                ? 'resourceadm.migration_no_access_rules'
                : validatePolicyData.status === 200
                  ? 'resourceadm.migration_access_rules_ready_for_migration'
                  : 'resourceadm.migration_step_access_rules_errors'
            }
            translationValues={{ validationErrors: validatePolicyData.errors.length }}
            onNavigateToPageWithError={() => navigateToPageWithError('policy')}
            isSuccess={validatePolicyData.status === 200}
          />
          <MigrationStep
            title={t('resourceadm.migration_step_publish_header')}
            text={
              deployOK
                ? 'resourceadm.migration_publish_success'
                : 'resourceadm.migration_publish_warning'
            }
            translationValues={{
              publishedEnvs: envPublishStatus
                .filter((env) => env.isResourcePublished)
                .map((env) => t(env.label))
                .join(', '),
            }}
            isSuccess={deployOK}
            onNavigateToPageWithError={() => navigateToPageWithError('deploy')}
          />
          <div className={classes.contentDivider} />
          <Label size='medium' spacing htmlFor='selectEnvDropdown'>
            {t('resourceadm.migration_select_environment_header')}
          </Label>
          <Paragraph size='small'>{t('resourceadm.migration_select_environment_body')}</Paragraph>
          <div>
            {envPublishStatus.map((env) => {
              const isPublishedInEnv = env.isResourcePublished;
              return (
                <Accordion key={env.id}>
                  <Accordion.Item>
                    <Accordion.Header>{t(env.label)}</Accordion.Header>
                    <Accordion.Content>
                      <MigrationPanel
                        serviceCode={serviceCode}
                        serviceEdition={serviceEdition}
                        env={env}
                        isMigrationReady={
                          validateResourceData.status === 200 && validatePolicyData?.status === 200
                        }
                        isPublishedInEnv={isPublishedInEnv}
                      />
                    </Accordion.Content>
                  </Accordion.Item>
                </Accordion>
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
