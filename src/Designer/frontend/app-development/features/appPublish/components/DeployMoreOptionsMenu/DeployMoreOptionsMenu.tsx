import { useState, type ReactElement } from 'react';
import { StudioDropdown, StudioLinkButton } from '@studio/components';
import {
  ArrowsCirclepathIcon,
  CloudSlashIcon,
  ExternalLinkIcon,
  MenuElipsisVerticalIcon,
} from '@studio/icons';
import { UndeployConsequenceDialog } from '../UndeployConsequenceDialog/UndeployConsequenceDialog';
import { RestartAppDialog } from '../RestartAppDialog';
import classes from './DeployMoreOptionsMenu.module.css';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useDeployPermissionsQuery } from 'app-development/hooks/queries';
import type { RunningApp } from 'app-shared/types/api/RunningApp';

type DeployMoreOptionsMenuProps = {
  environment: string;
  envTitle: string;
  linkToEnv: string;
  runningApp: RunningApp;
};

export const DeployMoreOptionsMenu = ({
  linkToEnv,
  environment,
  envTitle,
  runningApp,
}: DeployMoreOptionsMenuProps): ReactElement => {
  const { t } = useTranslation();
  const canRestart = useCanRestart(runningApp, environment);
  const [isRestartDialogOpen, setIsRestartDialogOpen] = useState(false);
  const [isUndeployDialogOpen, setIsUndeployDialogOpen] = useState(false);

  // The dialogs sit outside the menu, which closes when an item is chosen.
  return (
    <>
      <StudioDropdown
        icon={<MenuElipsisVerticalIcon />}
        triggerButtonVariant='tertiary'
        triggerButtonAriaLabel={t('app_deployment.deploy_more_options_menu_label')}
        triggerButtonClassName={classes.trigger}
        placement='bottom-end'
      >
        <StudioDropdown.List>
          {canRestart && (
            <StudioDropdown.Item>
              <StudioDropdown.Button
                data-color='neutral'
                icon={<ArrowsCirclepathIcon />}
                onClick={() => setIsRestartDialogOpen(true)}
                disabled={runningApp.status === 'updating'}
              >
                {t('app_deployment.restart_button')}
              </StudioDropdown.Button>
            </StudioDropdown.Item>
          )}
          <StudioDropdown.Item>
            <StudioLinkButton
              className={classes.linkButton}
              href={linkToEnv}
              icon={<ExternalLinkIcon />}
              rel='noopener noreferrer'
              variant='tertiary'
              data-color='neutral'
            >
              {t('app_deployment.more_options_menu')}
            </StudioLinkButton>
          </StudioDropdown.Item>
        </StudioDropdown.List>
        <StudioDropdown.List>
          <StudioDropdown.Item>
            <StudioDropdown.Button
              data-color='danger'
              icon={<CloudSlashIcon />}
              onClick={() => setIsUndeployDialogOpen(true)}
            >
              {t('app_deployment.undeploy_button')}
            </StudioDropdown.Button>
          </StudioDropdown.Item>
        </StudioDropdown.List>
      </StudioDropdown>
      {canRestart && (
        <RestartAppDialog
          runningApp={runningApp}
          envTitle={envTitle}
          isOpen={isRestartDialogOpen}
          onClose={() => setIsRestartDialogOpen(false)}
        />
      )}
      <UndeployConsequenceDialog
        environment={environment}
        isOpen={isUndeployDialogOpen}
        onClose={() => setIsUndeployDialogOpen(false)}
      />
    </>
  );
};

// The backend checks both again. Hiding the action saves the user a refusal.
const useCanRestart = (runningApp: RunningApp, environment: string): boolean => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: permissions = [] } = useDeployPermissionsQuery(org, app, {
    hideDefaultError: true,
  });
  const mayDeployHere = permissions.some(
    (permission) => permission.toLowerCase() === environment.toLowerCase(),
  );
  return runningApp.canRestart === true && mayDeployHere;
};
