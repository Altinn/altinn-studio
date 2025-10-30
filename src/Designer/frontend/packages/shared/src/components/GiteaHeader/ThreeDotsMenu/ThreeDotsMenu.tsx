import React, { useState } from 'react';
import classes from './ThreeDotsMenu.module.css';
import { TabsIcon, MenuElipsisVerticalIcon, GiteaIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { repositoryPath } from 'app-shared/api/paths';
import { StudioLinkButton, StudioPopover } from '@studio/components';
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
    <StudioPopover.TriggerContext>
      <StudioPopover.Trigger
        icon={<MenuElipsisVerticalIcon />}
        title={t('sync_header.gitea_menu')}
        variant='tertiary'
      />
      <StudioPopover data-color-scheme='light' className={classes.popover}>
        <ul className={classes.menuItems}>
          {isClonePossible && (
            <li>
              <StudioPopover.TriggerContext>
                <StudioPopover.Trigger
                  onClick={toggleClonePopoverOpen}
                  variant='tertiary'
                  className={classes.menuButton}
                  icon={<TabsIcon />}
                >
                  {t('sync_header.clone')}
                </StudioPopover.Trigger>
                <StudioPopover open={clonePopoverOpen} onClose={() => setClonePopoverOpen(false)}>
                  {clonePopoverOpen && (
                    <div className={classes.popoverContent}>
                      <ClonePopoverContent />
                    </div>
                  )}
                </StudioPopover>
              </StudioPopover.TriggerContext>
            </li>
          )}
          <li>
            <StudioLinkButton
              className={classes.link}
              data-color=''
              data-size='sm'
              href={repositoryPath(owner, repoName)}
              icon={<GiteaIcon />}
              rel='noopener noreferrer'
              variant='tertiary'
            >
              {t('sync_header.repository')}
            </StudioLinkButton>
          </li>
          <li>
            <LocalChangesModal triggerClassName={classes.menuButton} />
          </li>
        </ul>
      </StudioPopover>
    </StudioPopover.TriggerContext>
  );
};
