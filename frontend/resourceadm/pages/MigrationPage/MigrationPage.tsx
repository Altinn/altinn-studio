import React, { useState } from 'react';
import classes from './MigrationPage.module.css';
import { useParams } from 'react-router-dom';
import { useValidatePolicyQuery, useValidateResourceQuery } from 'resourceadm/hooks/queries';
import { MigrationStep } from 'resourceadm/components/MigrationStep';
import {
  Button,
  Textfield,
  Select,
  Heading,
  Paragraph,
  Spinner,
  Label,
  Link,
} from '@digdir/design-system-react';
import type { NavigationBarPage } from 'resourceadm/types/global';
import { useTranslation } from 'react-i18next';

const envOptions = [
  { value: 'Testmiljø TT-02', label: 'Testmiljø TT-02' },
  { value: 'Produksjonsmiljø', label: 'Produksjonsmiljø' },
];

type MigrationPageProps = {
  navigateToPageWithError: (page: NavigationBarPage) => void;
  id: string;
};

/**
 * @component
 *    Page that shows the information about migrating from Altinn 2 to Altinn 3
 *
 * @property {function}[navigateToPageWithError] - Function that navigates to a page with errors
 * @property {string}[id] - The id of the page
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const MigrationPage = ({
  navigateToPageWithError,
  id,
}: MigrationPageProps): React.ReactNode => {
  const { t } = useTranslation();

  const { selectedContext, resourceId } = useParams();
  const repo = `${selectedContext}-resources`;

  const { data: validatePolicyData, isPending: isValidatePolicyPending } = useValidatePolicyQuery(
    selectedContext,
    repo,
    resourceId,
  );
  const { data: validateResourceData, isPending: validateResourceLoading } =
    useValidateResourceQuery(selectedContext, repo, resourceId);

  // TODO - API call. Issue: #10715
  const deployOK = false;

  // TODO - This might be a saved value from backend. Issue: #10715
  const initialDate = new Date().toISOString().split('T')[0];
  const [migrationDate, setMigrationDate] = useState(initialDate);
  const [migrationTime, setMigrationTime] = useState('00:00');
  const [selectedEnv, setSelectedEnv] = useState('');
  const [numDelegationsA2, setNumDelegationsA2] = useState<number>(undefined);
  const [numDelegationsA3, setNumDelegationsA3] = useState<number>(undefined);

  /**
   * Display the content on the page
   */
  const displayContent = () => {
    if (isValidatePolicyPending || validateResourceLoading) {
      return (
        <div className={classes.spinnerWrapper}>
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
          <div className={classes.introWrapper}>
            <Paragraph size='small'>{t('resourceadm.migration_ingress')} </Paragraph>
            <Link
              href='https://docs.altinn.studio/authorization/modules/resourceregistry/'
              rel='noopener noreferrer'
              target='_blank'
            >
              {t('resourceadm.migration_help_link')}
            </Link>
          </div>
          <MigrationStep
            title={t('resourceadm.migration_step_about_resource_header')}
            text={
              validateResourceData.status === 200
                ? t('resourceadm.migration_ready_for_migration')
                : t('resourceadm.migration_step_about_resource_errors', {
                    validationErrors: validateResourceData.errors.length,
                  })
            }
            isSuccess={validateResourceData.status === 200}
            onNavigateToPageWithError={navigateToPageWithError}
            page='about'
          />
          <MigrationStep
            title={t('resourceadm.migration_step_access_rules_header')}
            text={
              validatePolicyData === undefined
                ? t('resourceadm.migration_no_access_rules')
                : validatePolicyData.status === 200
                ? t('resourceadm.migration_access_rules_ready_for_migration')
                : t('resourceadm.migration_step_access_rules_errors', {
                    validationErrors: validatePolicyData.errors.length,
                  })
            }
            isSuccess={validatePolicyData?.status === 200 ?? false}
            onNavigateToPageWithError={navigateToPageWithError}
            page='policy'
          />
          <MigrationStep
            title={t('resourceadm.migration_step_publish_header')}
            text={
              deployOK
                ? t('resourceadm.migration_publish_success')
                : t('resourceadm.migration_publish_warning')
            }
            isSuccess={deployOK}
            onNavigateToPageWithError={navigateToPageWithError}
            page='deploy'
          />
          <div className={classes.contentDivider} />
          <Label size='medium' spacing htmlFor='selectEnvDropdown'>
            {t('resourceadm.migration_select_environment_header')}
          </Label>
          <Paragraph size='small'>{t('resourceadm.migration_select_environment_body')}</Paragraph>
          <div className={classes.selectEnv}>
            <Select
              label={t('resourceadm.migration_select_environment_label')}
              hideLabel
              options={envOptions}
              value={selectedEnv}
              onChange={(o: string) => setSelectedEnv(o)}
              inputId='selectEnvDropdown'
            />
          </div>
          {selectedEnv !== '' && (
            <>
              <Label as='p' size='medium' spacing>
                {t('resourceadm.migration_select_migration_time_header')}
              </Label>
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
                <Label as='p' size='medium' spacing>
                  {t('resourceadm.migration_number_of_delegations')}
                </Label>
                <Button
                  onClick={() => {
                    // TODO - replace with API call
                    setNumDelegationsA2(1000);
                    setNumDelegationsA3(1000);
                  }}
                  className={classes.button}
                  size='small'
                >
                  {t('resourceadm.migration_get_number_of_delegations')}
                </Button>
                {numDelegationsA2 && numDelegationsA3 && (
                  <div className={classes.delegations}>
                    <Paragraph size='small'>
                      {t('resourceadm.resourceadm.migration_altinn_2')}:{' '}
                      <strong>{numDelegationsA2}</strong> {t('resourceadm.migration_delegations')}
                    </Paragraph>
                    <Paragraph size='small'>
                      {t('resourceadm.resourceadm.migration_altinn_3')}:{' '}
                      <strong>{numDelegationsA3}</strong> {t('resourceadm.migration_delegations')}
                    </Paragraph>
                  </div>
                )}
              </div>
              <Label as='p' size='medium' spacing>
                {t('resourceadm.migration_finish_migration')}
              </Label>
              <Paragraph size='small'>{t('"resourceadm.migration_delegation_info"')}</Paragraph>
              <div className={classes.buttonWrapper}>
                <Button
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
                </Button>
                <Button
                  aria-disabled // Remember to do same check for aria-disabled as fot button below
                  onClick={() => {}}
                  className={classes.button}
                  size='small'
                >
                  {t('resourceadm.migration_turn_off_altinn_2_service')}
                </Button>
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
