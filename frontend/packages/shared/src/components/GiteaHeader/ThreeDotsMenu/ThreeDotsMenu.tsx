import React, { useState } from 'react';
import classes from './ThreeDotsMenu.module.css';
import { MonitorIcon, TabsIcon, MenuElipsisVerticalIcon, GiteaIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { repositoryPath } from 'app-shared/api/paths';
// import { GiteaIcon } from 'app-shared/icons';
import { LegacyPopover, Link } from '@digdir/design-system-react';
import { StudioButton, StudioPopover } from '@studio/components';
import { LocalChangesModal } from './LocalChangesModal';
import { ClonePopoverContent } from './ClonePopoverContent';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export type ThreeDotsMenuProps = {
  isClonePossible?: boolean;
};

export const ThreeDotsMenu = ({ isClonePossible = false }: ThreeDotsMenuProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();
  const [localChangesModalIsOpen, setLocalChangesModalIsOpen] = useState(false);
  const [clonePopoverOpen, setClonePopoverOpen] = useState(false);

  const toggleClonePopoverOpen = () => setClonePopoverOpen((oldValue) => !oldValue);
  const openLocalChangesModal = () => setLocalChangesModalIsOpen(true);

  return (
    <LegacyPopover
      className={classes.popover}
      trigger={
        <StudioButton
          color='inverted'
          icon={<MenuElipsisVerticalIcon />}
          size='small'
          title={t('sync_header.gitea_menu')}
          variant='tertiary'
        />
      }
    >
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
            asChild
            size='small'
            variant='tertiary'
            fullWidth
            className={classes.menuButton}
          >
            <Link
              href={repositoryPath(org, app)}
              rel='noopener noreferrer'
              className={classes.link}
            >
              <GiteaIcon />
              {t('sync_header.repository')}
            </Link>
          </StudioButton>
        </li>
        <li>
          <StudioButton
            onClick={openLocalChangesModal}
            size='small'
            className={classes.menuButton}
            variant='tertiary'
          >
            <MonitorIcon />
            {t('sync_header.local_changes')}
          </StudioButton>
        </li>
        {localChangesModalIsOpen && (
          <LocalChangesModal
            isOpen={localChangesModalIsOpen}
            onClose={() => setLocalChangesModalIsOpen(false)}
          />
        )}
      </ul>
    </LegacyPopover>
  );
};
