import React, { useState } from 'react';
import classes from './MigrationPage.module.css';
import {
  useResourcePolicyPublishStatusQuery,
  useValidatePolicyQuery,
  useValidateResourceQuery,
} from '../../hooks/queries';
import { MigrationStep } from '../../components/MigrationStep';
import {
  Textfield,
  Heading,
  Paragraph,
  Spinner,
  Label,
  Link,
  Radio,
} from '@digdir/designsystemet-react';
import type { NavigationBarPage } from '../../types/NavigationBarPage';
import { useTranslation } from 'react-i18next';
import { useUrlParams } from '../../hooks/useUrlParams';
import { StudioButton, StudioLabelAsParagraph } from '@studio/components';
import type { EnvId } from '../../utils/resourceUtils';
import { getAvailableEnvironments } from '../../utils/resourceUtils';
import { useGetAltinn2DelegationsCount } from 'resourceadm/hooks/queries/useGetAltinn2DelegationCount';

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

  // TODO - This might be a saved value from backend. Issue: #10715
  const initialDate = new Date().toISOString().split('T')[0];
  const [migrationDate, setMigrationDate] = useState(initialDate);
  const [migrationTime, setMigrationTime] = useState('00:00');
  const [selectedEnv, setSelectedEnv] = useState<EnvId | ''>('');
  const [isDelegationCountEnabled, setIsDelegationCountEnabled] = useState<boolean>(false);

  const { data: validatePolicyData, isPending: isValidatePolicyPending } = useValidatePolicyQuery(
    org,
    app,
    resourceId,
  );
  const { data: validateResourceData, isPending: validateResourceLoading } =
    useValidateResourceQuery(org, app, resourceId);
  const { isPending: isLoadingPublishStatus, data: publishStatusData } =
    useResourcePolicyPublishStatusQuery(org, app, resourceId);

  const { data: numberOfA2Delegations, refetch: refetchNumberOfA2Delegations } =
    useGetAltinn2DelegationsCount(
      org,
      serviceCode,
      serviceEdition,
      selectedEnv,
      !isDelegationCountEnabled,
    );

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
          <Paragraph size='small'>
            {t('resourceadm.migration_ingress')}
            <Link
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
              validatePolicyData === undefined
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
          <Radio.Group
            hideLegend
            onChange={(newEnv: EnvId) => {
              setSelectedEnv(newEnv);
              setIsDelegationCountEnabled(false);
            }}
            value={selectedEnv || '-'}
            legend={t('resourceadm.migration_select_environment_header')}
            description={t('resourceadm.migration_select_environment_body')}
          >
            {envPublishStatus.map((env) => {
              const isPublishedInEnv = env.isResourcePublished;
              return (
                <Radio key={env.id} value={env.id}>
                  {`${t(env.label)} ${!isPublishedInEnv ? t('resourceadm.migration_environment_not_published') : ''}`}
                </Radio>
              );
            })}
          </Radio.Group>
          {selectedEnv && (
            <>
              <StudioLabelAsParagraph size='medium' spacing>
                {t('resourceadm.migration_select_migration_time_header')}
              </StudioLabelAsParagraph>
              <Paragraph size='small'>
                {t('resourceadm.migration_select_migration_time_body')}
              </Paragraph>
              <div className={classes.datePickers}>
                <div className={classes.datePickerWrapper}>
                  <Textfield
                    type='date'
                    value={migrationDate}
                    onChange={(e) => setMigrationDate(e.target.value)}
                    label={t('resourceadm.migration_migration_date')}
                    size='small'
                  />
                </div>
                <div className={classes.datePickerWrapper}>
                  <Textfield
                    type='time'
                    value={migrationTime}
                    onChange={(e) => setMigrationTime(e.target.value)}
                    label={t('resourceadm.migration_migration_time')}
                    size='small'
                  />
                </div>
              </div>
              <div className={classes.numDelegations}>
                <StudioLabelAsParagraph size='medium' spacing>
                  {t('resourceadm.migration_number_of_delegations')}
                </StudioLabelAsParagraph>
                <div>
                  {isDelegationCountEnabled && numberOfA2Delegations && (
                    <div className={classes.delegations}>
                      <Paragraph size='small'>
                        {t('resourceadm.migration_altinn_2')}:{' '}
                        <strong>{numberOfA2Delegations.numberOfDelegations}</strong>{' '}
                        {t('resourceadm.migration_delegations')}
                      </Paragraph>
                      <Paragraph size='small'>
                        {t('resourceadm.migration_altinn_3')}: <strong>{1000}</strong>{' '}
                        {t('resourceadm.migration_delegations')}
                      </Paragraph>
                    </div>
                  )}
                  <StudioButton
                    onClick={() =>
                      isDelegationCountEnabled
                        ? refetchNumberOfA2Delegations()
                        : setIsDelegationCountEnabled(true)
                    }
                    className={classes.button}
                    size='small'
                  >
                    {t('resourceadm.migration_get_number_of_delegations')}
                  </StudioButton>
                </div>
              </div>
              <StudioLabelAsParagraph size='medium' spacing>
                {t('resourceadm.migration_finish_migration')}
              </StudioLabelAsParagraph>
              <Paragraph size='small'>{t('resourceadm.migration_delegation_info')}</Paragraph>
              <div className={classes.buttonWrapper}>
                <StudioButton
                  aria-disabled={
                    !(
                      validateResourceData.status === 200 &&
                      validatePolicyData?.status === 200 &&
                      deployOK
                    )
                  }
                  onClick={
                    validateResourceData.status === 200 &&
                    validatePolicyData?.status === 200 &&
                    deployOK
                      ? () => {} // TODO
                      : undefined
                  }
                  className={classes.button}
                  size='small'
                >
                  {t('resourceadm.migration_migrate_delegations')}
                </StudioButton>
                <StudioButton
                  aria-disabled // Remember to do same check for aria-disabled as fot button below
                  onClick={() => {}}
                  className={classes.button}
                  size='small'
                >
                  {t('resourceadm.migration_turn_off_altinn_2_service')}
                </StudioButton>
              </div>
            </>
          )}
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
