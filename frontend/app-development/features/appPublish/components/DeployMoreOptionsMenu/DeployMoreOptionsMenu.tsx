import React, { ReactElement } from 'react';
import { StudioPageHeader, StudioPopover, StudioButton } from '@studio/components';
import { ExternalLinkIcon, MenuElipsisVerticalIcon } from '@studio/icons';
import { UndeployConsequenceDialog } from '../UndeployConsequenceDialog/UndeployConsequenceDialog';
import classes from './DeployMoreOptionsMenu.module.css';

type DeployMoreOptionsMenuProps = {
  linkToEnv: string;
};

export const DeployMoreOptionsMenu = ({ linkToEnv }: DeployMoreOptionsMenuProps): ReactElement => {
  return (
    <StudioPopover>
      <StudioPageHeader.PopoverTrigger
        icon={<MenuElipsisVerticalIcon />}
        title={'test'}
        color='light'
        variant='regular'
      />
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
              link ti env
            </StudioButton>
          </li>
        </ul>
      </StudioPopover.Content>
    </StudioPopover>
  );
};
