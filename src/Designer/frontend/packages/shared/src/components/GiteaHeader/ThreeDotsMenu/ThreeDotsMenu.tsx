import React from 'react';
import classes from './ThreeDotsMenu.module.css';
import { TabsIcon, MenuElipsisVerticalIcon, GiteaIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { repositoryPath } from 'app-shared/api/paths';
import { StudioLinkButton, StudioList, StudioPopover } from '@studio/components';
import { LocalChangesModal } from './LocalChangesModal';
import { ClonePopoverContent } from './ClonePopoverContent';
import { useGiteaHeaderContext } from '../context/GiteaHeaderContext';

export type ThreeDotsMenuProps = {
  isClonePossible?: boolean;
};

export const ThreeDotsMenu = ({ isClonePossible = false }: ThreeDotsMenuProps) => {
  const { owner, repoName } = useGiteaHeaderContext();
  const { t } = useTranslation();

  return (
    <StudioPopover.TriggerContext>
      <StudioPopover.Trigger
        icon={<MenuElipsisVerticalIcon />}
        title={t('sync_header.gitea_menu')}
        variant='tertiary'
      />
      <StudioPopover data-color-scheme='light' className={classes.popover}>
        <StudioList.Root className={classes.menuItems}>
          {isClonePossible && (
            <StudioPopover.TriggerContext>
              <StudioPopover.Trigger
                variant='tertiary'
                className={classes.menuButton}
                icon={<TabsIcon />}
              >
                {t('sync_header.clone')}
              </StudioPopover.Trigger>
              <StudioPopover>{<ClonePopoverContent />}</StudioPopover>
            </StudioPopover.TriggerContext>
          )}
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
          <LocalChangesModal triggerClassName={classes.menuButton} />
        </StudioList.Root>
      </StudioPopover>
    </StudioPopover.TriggerContext>
  );
};
