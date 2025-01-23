import React, { type ReactElement } from 'react';
import { StudioPopover, StudioButton } from '@studio/components';
import { ExternalLinkIcon, MenuElipsisVerticalIcon } from '@studio/icons';
import { UndeployConsequenceDialog } from '../UndeployConsequenceDialog/UndeployConsequenceDialog';
import classes from './DeployMoreOptionsMenu.module.css';
import { useTranslation } from 'react-i18next';

type DeployMoreOptionsMenuProps = {
  linkToEnv: string;
};

export const DeployMoreOptionsMenu = ({ linkToEnv }: DeployMoreOptionsMenuProps): ReactElement => {
  const { t } = useTranslation();
  return (
    <StudioPopover>
      <StudioPopover.Trigger size='sm' variant='secondary' className={classes.trigger}>
        <MenuElipsisVerticalIcon />
      </StudioPopover.Trigger>
      <StudioPopover.Content className={classes.content}>
        <ul className={classes.listContainer}>
          <li>
            <UndeployConsequenceDialog />
          </li>
          <li>
            <StudioButton
              className={classes.itemButton}
              as='a'
              fullWidth
              href={linkToEnv}
              icon={<ExternalLinkIcon />}
              rel='noopener noreferrer'
              size='sm'
              variant='tertiary'
            >
              {t('app_deployment.more_options_menu')}
            </StudioButton>
          </li>
        </ul>
      </StudioPopover.Content>
    </StudioPopover>
  );
};
