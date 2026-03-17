import React from 'react';
import { TabsIcon, MenuElipsisVerticalIcon, GiteaIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { repositoryPath } from 'app-shared/api/paths';
import { StudioPopover, StudioDropdown, StudioLinkButton } from '@studio/components';
import { LocalChangesModal } from './LocalChangesModal';
import { ClonePopoverContent } from './ClonePopoverContent';
import { useGiteaHeaderContext } from '../context/GiteaHeaderContext';
import classes from './ThreeDotsMenu.module.css';

export type ThreeDotsMenuProps = {
  isClonePossible?: boolean;
};

export const ThreeDotsMenu = ({ isClonePossible = false }: ThreeDotsMenuProps) => {
  const { owner, repoName } = useGiteaHeaderContext();
  const { t } = useTranslation();

  return (
    <StudioDropdown
      icon={<MenuElipsisVerticalIcon title={t('sync_header.gitea_menu')} />}
      triggerButtonAriaLabel={t('sync_header.gitea_menu')}
      triggerButtonVariant='tertiary'
      data-color-scheme='light'
    >
      <StudioDropdown.List>
        {isClonePossible && (
          <StudioDropdown.Item>
            <StudioPopover.TriggerContext>
              <StudioPopover.Trigger variant='tertiary' icon={<TabsIcon />}>
                {t('sync_header.clone')}
              </StudioPopover.Trigger>
              <StudioPopover>{<ClonePopoverContent />}</StudioPopover>
            </StudioPopover.TriggerContext>
          </StudioDropdown.Item>
        )}
        <StudioDropdown.Item>
          <StudioLinkButton
            icon={<GiteaIcon />}
            className={classes.linkButton}
            href={repositoryPath(owner, repoName)}
            variant='tertiary'
            data-color='subtle'
            target='_blank'
            rel='noopener noreferrer'
          >
            {t('sync_header.repository')}
          </StudioLinkButton>
        </StudioDropdown.Item>
        <StudioDropdown.Item>
          <LocalChangesModal />
        </StudioDropdown.Item>
      </StudioDropdown.List>
    </StudioDropdown>
  );
};
