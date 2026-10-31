import { useState, type ReactElement } from 'react';
import { StudioButton, StudioPopover, StudioLink, StudioList } from '@studio/components';
import { ExternalLinkIcon, MenuElipsisVerticalIcon } from '@studio/icons';
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRestartDialogOpen, setIsRestartDialogOpen] = useState(false);

  // The dialog sits outside the menu, so the menu can close behind it.
  const openRestartDialog = (): void => {
    setIsMenuOpen(false);
    setIsRestartDialogOpen(true);
  };

  return (
    <>
      <StudioPopover.TriggerContext>
        <StudioPopover.Trigger
          variant='secondary'
          className={classes.trigger}
          aria-label={t('app_deployment.deploy_more_options_menu_label')}
          icon={<MenuElipsisVerticalIcon />}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        />
        <StudioPopover
          className={classes.content}
          open={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
        >
          <StudioList.Root className={classes.listContainer}>
            {canRestart && (
              <StudioList.Item>
                <StudioButton
                  variant='tertiary'
                  onClick={openRestartDialog}
                  disabled={runningApp.status === 'updating'}
                >
                  {t('app_deployment.restart_button')}
                </StudioButton>
              </StudioList.Item>
            )}
            <StudioList.Item>
              <UndeployConsequenceDialog environment={environment} />
            </StudioList.Item>
            <StudioList.Item>
              <StudioLink
                className={classes.linkButton}
                href={linkToEnv}
                icon={<ExternalLinkIcon />}
                rel='noopener noreferrer'
              >
                {t('app_deployment.more_options_menu')}
              </StudioLink>
            </StudioList.Item>
          </StudioList.Root>
        </StudioPopover>
      </StudioPopover.TriggerContext>
      {canRestart && (
        <RestartAppDialog
          runningApp={runningApp}
          envTitle={envTitle}
          isOpen={isRestartDialogOpen}
          onClose={() => setIsRestartDialogOpen(false)}
        />
      )}
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
