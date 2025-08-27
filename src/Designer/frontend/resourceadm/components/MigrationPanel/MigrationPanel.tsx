import React, { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  StudioAlert,
  StudioButton,
  StudioCheckbox,
  StudioHeading,
  StudioModal,
} from 'libs/studio-components-legacy/src';
import classes from './MigrationPanel.module.css';
import { getMigrationErrorMessage, type Environment } from '../../utils/resourceUtils';
import { useGetAltinn2DelegationsCount } from '../../hooks/queries/useGetAltinn2DelegationCount';
import { useMigrateDelegationsMutation } from '../../hooks/mutations/useMigrateDelegationsMutation';
import { useUrlParams } from '../../hooks/useUrlParams';

export interface MigrationPanelProps {
  serviceCode: string;
  serviceEdition: string;
  env: Environment;
  isPublishedInEnv: boolean;
}

export const MigrationPanel = ({
  serviceCode,
  serviceEdition,
  env,
  isPublishedInEnv,
}: MigrationPanelProps): React.ReactNode => {
  const { t } = useTranslation();

  const { org, resourceId } = useUrlParams();

  const setServiceExpiredWarningModalRef = useRef<HTMLDialogElement>(null);
  const [migrateDelegationsError, setMigrateDelegationsError] = useState<Error | null>(null);
  const [isMigrateCheckboxChecked, setIsMigrateCheckboxChecked] = useState<boolean>(false);

  const { mutate: migrateDelegations, isPending: isSettingMigrateDelegations } =
    useMigrateDelegationsMutation(org, env.id);

  const {
    data: numberOfA2Delegations,
    isFetching: isLoadingDelegationCount,
    error: loadDelegationCountError,
  } = useGetAltinn2DelegationsCount(org, serviceCode, serviceEdition, env.id);

  const postMigrateDelegations = (): void => {
    setMigrateDelegationsError(null);
    closeSetServiceExpiredModal();

    migrateDelegations(
      {
        serviceCode: serviceCode,
        serviceEditionCode: parseInt(serviceEdition),
        resourceId: resourceId,
      },
      {
        onSuccess: () => {
          toast.success(t('resourceadm.migration_migration_success', { env: t(env.label) }));
        },
        onError: (error: Error) => {
          setMigrateDelegationsError(error);
        },
      },
    );
  };

  const closeSetServiceExpiredModal = (): void => {
    setServiceExpiredWarningModalRef.current?.close();
  };

  const errorMessage = getMigrationErrorMessage(
    loadDelegationCountError,
    migrateDelegationsError,
    isPublishedInEnv,
  );
  const isMigrateButtonDisabled = !!errorMessage || isSettingMigrateDelegations;

  return (
    <>
      <StudioModal.Dialog
        heading={t('resourceadm.migration_disable_service_modal_header')}
        closeButtonTitle={t('resourceadm.close_modal')}
        ref={setServiceExpiredWarningModalRef}
        footer={
          <>
            <StudioButton
              disabled={!isMigrateCheckboxChecked}
              onClick={() => postMigrateDelegations()}
              size='md'
            >
              {t('resourceadm.migration_disable_service_confirm')}
            </StudioButton>
            <StudioButton variant='tertiary' onClick={closeSetServiceExpiredModal} size='md'>
              {t('general.cancel')}
            </StudioButton>
          </>
        }
      >
        <StudioAlert severity='warning'>
          {t('resourceadm.migration_disable_service_modal_body')}
        </StudioAlert>
        <StudioCheckbox.Group
          legend=''
          onChange={() => setIsMigrateCheckboxChecked((old) => !old)}
          value={isMigrateCheckboxChecked ? ['checked'] : []}
        >
          <StudioCheckbox value='checked'>
            {t('resourceadm.migration_confirm_migration')}
          </StudioCheckbox>
        </StudioCheckbox.Group>
      </StudioModal.Dialog>
      <div className={classes.migrationPanel}>
        <div className={classes.migrationPanelInner}>
          <StudioHeading size='sm'>{t(env.label)}</StudioHeading>
          <div>
            {t('resourceadm.migration_altinn2_delegations')}{' '}
            {!isLoadingDelegationCount && (
              <strong>{numberOfA2Delegations?.numberOfDelegations ?? 'N/A'}</strong>
            )}
          </div>
          <div>
            {t('resourceadm.migration_altinn3_delegations')} <strong>N/A</strong>
          </div>
          {isPublishedInEnv && numberOfA2Delegations?.numberOfDelegations === 0 && (
            <StudioAlert severity='info' size='sm'>
              {t('resourceadm.migration_not_needed')}
            </StudioAlert>
          )}
          {errorMessage && (
            <StudioAlert severity={errorMessage.severity}>
              {t(errorMessage.errorMessage)}
            </StudioAlert>
          )}
        </div>
        <StudioButton
          aria-disabled={isMigrateButtonDisabled}
          onClick={() => {
            if (!isMigrateButtonDisabled) {
              setServiceExpiredWarningModalRef.current?.showModal();
            }
          }}
        >
          {t('resourceadm.migration_migrate_environment', { env: t(env.label) })}
        </StudioButton>
      </div>
    </>
  );
};
