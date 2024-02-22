import React, { useState } from 'react';
import classes from './ThreeDotsMenu.module.css';
import { MonitorIcon, TabsIcon, MenuElipsisVerticalIcon } from '@navikt/aksel-icons';
import { useTranslation } from 'react-i18next';
import { repositoryPath } from 'app-shared/api/paths';
import { GiteaIcon } from 'app-shared/icons';
import { LegacyPopover } from '@digdir/design-system-react';
import { CloneModal } from './CloneModal';
import { StudioButton } from '@studio/components';
import { LocalChangesModal } from './LocalChangesModal';

export type ThreeDotsMenuProps = {
  onlyShowRepository?: boolean;
  hasCloneModal?: boolean;
  org: string;
  app: string;
};

export const ThreeDotsMenu = ({
  onlyShowRepository = false,
  hasCloneModal = false,
  org,
  app,
}: ThreeDotsMenuProps) => {
  const [cloneModalAnchor, setCloneModalAnchor] = useState(null);
  const { t } = useTranslation();
  const closeCloneModal = () => setCloneModalAnchor(null);
  const openCloneModal = (event: React.MouseEvent) => setCloneModalAnchor(event.currentTarget);
  const [localChangesModalIsOpen, setLocalChangesModalIsOpen] = useState(false);

  return (
    <>
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
          {!onlyShowRepository && (
            <li>
              <button onClick={openCloneModal} className={classes.link}>
                <span className={classes.iconWrapper}>
                  <TabsIcon className={classes.icon} />
                </span>
                <span>{t('sync_header.clone')}</span>
              </button>
            </li>
          )}
          <li>
            <a href={repositoryPath(org, app)} className={classes.link}>
              <span className={classes.iconWrapper}>
                <GiteaIcon className={classes.icon + ' ' + classes.giteaIcon} />
              </span>
              <span>{t('sync_header.repository')}</span>
            </a>
          </li>
          <li>
            <button onClick={() => setLocalChangesModalIsOpen(true)} className={classes.link}>
              <span className={classes.iconWrapper}>
                <MonitorIcon className={classes.icon} />
              </span>
              <span>{t('sync_header.local_changes')}</span>
            </button>
          </li>
          {localChangesModalIsOpen && (
            <LocalChangesModal
              isOpen={localChangesModalIsOpen}
              onClose={() => setLocalChangesModalIsOpen(false)}
              org={org}
              app={app}
            />
          )}
        </ul>
      </LegacyPopover>
      {hasCloneModal && <CloneModal anchorEl={cloneModalAnchor} onClose={closeCloneModal} />}
    </>
  );
};
