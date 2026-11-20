import type { ReactElement } from 'react';
import { useState } from 'react';
import classes from './DeployPopover.module.css';
import { StudioButton, StudioParagraph, StudioPopover, StudioSpinner } from '@designer/components';
import { useTranslation } from 'react-i18next';
import { usePostHog } from '@posthog/react';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useDeployWarningsQuery } from 'app-development/hooks/queries';
import type { DeployWarning, DeployWarnings } from 'app-shared/types/api/DeployWarnings';

export const DEPLOY_EVENT_NAME = 'user_confirmed_app_deploy';

const deployWarningTextKeys: Record<DeployWarning, string> = {
  upgradeToV9: 'app_deployment.deploy_warning.upgrade_to_v9',
  rollbackFromV9: 'app_deployment.deploy_warning.rollback_from_v9',
  prereleaseToProduction: 'app_deployment.deploy_warning.prerelease_to_production',
};

export type DeployPopoverProps = {
  appDeployedVersion: string;
  selectedImageTag: string;
  envName: string;
  disabled: boolean;
  isPending: boolean;
  onConfirm: () => void;
};

export const DeployPopover = ({
  appDeployedVersion,
  selectedImageTag,
  envName,
  disabled,
  isPending,
  onConfirm,
}: DeployPopoverProps): ReactElement => {
  const { t } = useTranslation();
  const posthog = usePostHog();
  const { org, app } = useStudioEnvironmentParams();
  // Loading, not pending, since the query waits for a release to be chosen.
  const { data: deployWarnings, isLoading: isCheckingVersions } = useDeployWarningsQuery(
    org,
    app,
    envName,
    selectedImageTag,
    appDeployedVersion,
  );

  const [isConfirmDeployDialogOpen, setIsConfirmDeployDialogOpen] = useState<boolean>();

  const handleDeployConfirm = () => {
    onConfirm();
    posthog.capture(DEPLOY_EVENT_NAME);
    setIsConfirmDeployDialogOpen(false);
  };

  return (
    <StudioPopover.TriggerContext>
      <StudioPopover.Trigger
        disabled={!selectedImageTag || disabled}
        onClick={() => setIsConfirmDeployDialogOpen((prevState) => !prevState)}
      >
        {isPending && <PopoverSpinner />}
        {t('app_deployment.btn_deploy_new_version')}
      </StudioPopover.Trigger>
      <StudioPopover
        className={classes.popover}
        placement='right'
        open={isConfirmDeployDialogOpen}
        onClose={() => setIsConfirmDeployDialogOpen(false)}
        data-color='warning'
        variant='tinted'
      >
        {isConfirmDeployDialogOpen && (
          <>
            {isCheckingVersions ? (
              <StudioSpinner
                aria-hidden
                spinnerTitle={t('app_deployment.deploy_warnings_loading')}
              />
            ) : (
              <DeployWarningTexts deployWarnings={deployWarnings} />
            )}
            <StudioParagraph spacing>
              {appDeployedVersion
                ? t('app_deployment.deploy_confirmation', {
                    selectedImageTag,
                    appDeployedVersion,
                  })
                : t('app_deployment.deploy_confirmation_short', { selectedImageTag })}
            </StudioParagraph>
            <div className={classes.buttonContainer}>
              <StudioButton
                data-color='first'
                variant='primary'
                onClick={handleDeployConfirm}
                // Waits for the warnings, so a quick click does not deploy past one. The check gives up on an
                // environment that does not answer within seconds, and a failed check shows no warnings.
                disabled={isCheckingVersions}
              >
                {t('general.yes')}
              </StudioButton>
              <StudioButton
                data-color='second'
                variant='tertiary'
                onClick={() => setIsConfirmDeployDialogOpen(false)}
              >
                {t('general.cancel')}
              </StudioButton>
            </div>
          </>
        )}
      </StudioPopover>
    </StudioPopover.TriggerContext>
  );
};

type DeployWarningTextsProps = {
  deployWarnings: DeployWarnings | undefined;
};

const DeployWarningTexts = ({ deployWarnings }: DeployWarningTextsProps): ReactElement => {
  const { t } = useTranslation();
  // A warning from a newer backend is left out until the frontend has a text for it.
  const textKeys = (deployWarnings?.warnings ?? [])
    .map((warning) => deployWarningTextKeys[warning])
    .filter(Boolean);
  return (
    <>
      {textKeys.map((textKey) => (
        <StudioParagraph key={textKey} spacing>
          {t(textKey, {
            releaseVersion: deployWarnings.releaseAppLibVersion,
            environmentVersion: deployWarnings.environmentAppLibVersion,
          })}
        </StudioParagraph>
      ))}
    </>
  );
};

const PopoverSpinner = () => {
  const { t } = useTranslation();
  return <StudioSpinner spinnerTitle={t('app_deployment.deploy_loading')} aria-hidden />;
};
