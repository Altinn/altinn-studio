import React, { useState } from 'react';
import { TabsIcon, MenuElipsisVerticalIcon, GiteaIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { repositoryPath } from 'app-shared/api/paths';
import { StudioPopover, StudioDropdown } from '@studio/components';
import { LocalChangesModal } from './LocalChangesModal';
import { ClonePopoverContent } from './ClonePopoverContent';
import { useGiteaHeaderContext } from '../context/GiteaHeaderContext';

export type ThreeDotsMenuProps = {
  isClonePossible?: boolean;
};

export const ThreeDotsMenu = ({ isClonePossible = false }: ThreeDotsMenuProps) => {
  const { owner, repoName } = useGiteaHeaderContext();
  const { t } = useTranslation();

  const handleNavigateToGitea = () => {
    window.location.href = repositoryPath(owner, repoName);
  };

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
              <StudioPopover.Trigger
                variant='tertiary'
                icon={<TabsIcon />}
              >
                {t('sync_header.clone')}
              </StudioPopover.Trigger>
              <StudioPopover>{<ClonePopoverContent />}</StudioPopover>
            </StudioPopover.TriggerContext>
          </StudioDropdown.Item>
        )}
        <StudioDropdown.Item>
          <StudioDropdown.Button icon={<GiteaIcon />} onClick={handleNavigateToGitea}>
            {t('sync_header.repository')}
          </StudioDropdown.Button>
        </StudioDropdown.Item>
        <StudioDropdown.Item>
          <LocalChangesModal />
        </StudioDropdown.Item>
      </StudioDropdown.List>
    </StudioDropdown>
  );
};
