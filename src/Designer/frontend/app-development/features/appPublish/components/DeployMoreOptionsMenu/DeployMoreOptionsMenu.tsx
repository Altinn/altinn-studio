import React, { type ReactElement } from 'react';
import { StudioPopover } from '@studio/components-legacy';
import { StudioLink } from '@studio/components';
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
    <StudioPopover>
      <StudioPopover.Trigger
        size='sm'
        variant='secondary'
        className={classes.trigger}
        aria-label={t('app_deployment.deploy_more_options_menu_label')}
      >
        <MenuElipsisVerticalIcon />
      </StudioPopover.Trigger>
      <StudioPopover.Content className={classes.content}>
        <ul className={classes.listContainer}>
          <li>
            <UndeployConsequenceDialog environment={environment} />
          </li>
          <li>
            <StudioLink
              className={classes.itemButton}
              href={linkToEnv}
              icon={<ExternalLinkIcon />}
              rel='noopener noreferrer'
            >
              {t('app_deployment.more_options_menu')}
            </StudioLink>
          </li>
        </ul>
      </StudioPopover.Content>
    </StudioPopover>
  );
};
