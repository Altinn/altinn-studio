import React, { useState } from 'react';
import classes from './ThreeDotsMenu.module.css';
import { TabsIcon, MenuElipsisVerticalIcon, GiteaIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { repositoryPath } from 'app-shared/api/paths';
import { StudioButton, StudioPageHeader, StudioPopover } from '@studio/components';
import { LocalChangesModal } from './LocalChangesModal';
import { ClonePopoverContent } from './ClonePopoverContent';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export type ThreeDotsMenuProps = {
  isClonePossible?: boolean;
};

export const ThreeDotsMenu = ({ isClonePossible = false }: ThreeDotsMenuProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();
  const [clonePopoverOpen, setClonePopoverOpen] = useState(false);

  const toggleClonePopoverOpen = () => setClonePopoverOpen((oldValue) => !oldValue);

  return (
    <StudioPopover>
      <StudioPageHeader.PopoverTrigger
        icon={<MenuElipsisVerticalIcon />}
        title={t('sync_header.gitea_menu')}
        color='light'
        variant='regular'
      />
      <StudioPopover.Content className={classes.popover}>
        <ul className={classes.menuItems}>
          {isClonePossible && (
            <li>
              <StudioPopover open={clonePopoverOpen} onClose={toggleClonePopoverOpen}>
                <StudioPopover.Trigger
                  fullWidth
                  onClick={toggleClonePopoverOpen}
                  variant='tertiary'
                  className={classes.menuButton}
                  size='small'
                >
                  <TabsIcon />
                  {t('sync_header.clone')}
                </StudioPopover.Trigger>
                <StudioPopover.Content className={classes.popoverContent}>
                  <ClonePopoverContent onClose={toggleClonePopoverOpen} />
                </StudioPopover.Content>
              </StudioPopover>
            </li>
          )}
          <li>
            <StudioButton
              as='a'
              className={classes.menuButton + ' ' + classes.link}
              fullWidth
              href={repositoryPath(org, app)}
              icon={<GiteaIcon />}
              rel='noopener noreferrer'
              size='small'
              variant='tertiary'
            >
              {t('sync_header.repository')}
            </StudioButton>
          </li>
          <li>
            <LocalChangesModal triggerClassName={classes.menuButton} />
          </li>
        </ul>
      </StudioPopover.Content>
    </StudioPopover>
  );
};
