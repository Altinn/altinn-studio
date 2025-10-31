import React, { type ReactElement } from 'react';
import { StudioPopover, StudioLink, StudioList } from '@studio/components';
import { ExternalLinkIcon, MenuElipsisVerticalIcon } from '@studio/icons';
import { UndeployConsequenceDialog } from '../UndeployConsequenceDialog/UndeployConsequenceDialog';
import classes from './DeployMoreOptionsMenu.module.css';
import { useTranslation } from 'react-i18next';

type DeployMoreOptionsMenuProps = {
  environment: string;
  linkToEnv: string;
};

export const DeployMoreOptionsMenu = ({
  linkToEnv,
  environment,
}: DeployMoreOptionsMenuProps): ReactElement => {
  const { t } = useTranslation();
  return (
    <StudioPopover.TriggerContext>
      <StudioPopover.Trigger
        variant='secondary'
        className={classes.trigger}
        aria-label={t('app_deployment.deploy_more_options_menu_label')}
        icon={<MenuElipsisVerticalIcon />}
      />
      <StudioPopover className={classes.content}>
        <StudioList.Root className={classes.listContainer}>
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
  );
};
