import React, { useState } from 'react';
import classes from './ThreeDotsMenu.module.css';
import { TabsIcon, MenuElipsisVerticalIcon, GiteaIcon } from 'libs/studio-icons/src';
import { useTranslation } from 'react-i18next';
import { repositoryPath } from 'app-shared/api/paths';
import { StudioButton, StudioPageHeader, StudioPopover } from '@studio/components-legacy';
import { LocalChangesModal } from './LocalChangesModal';
import { ClonePopoverContent } from './ClonePopoverContent';
import { useGiteaHeaderContext } from '../context/GiteaHeaderContext';

export type ThreeDotsMenuProps = {
  isClonePossible?: boolean;
};

export const ThreeDotsMenu = ({ isClonePossible = false }: ThreeDotsMenuProps) => {
  const { owner, repoName } = useGiteaHeaderContext();
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
                  <ClonePopoverContent />
                </StudioPopover.Content>
              </StudioPopover>
            </li>
          )}
          <li>
            <StudioButton
              as='a'
              className={classes.menuButton + ' ' + classes.link}
              fullWidth
              href={repositoryPath(owner, repoName)}
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
