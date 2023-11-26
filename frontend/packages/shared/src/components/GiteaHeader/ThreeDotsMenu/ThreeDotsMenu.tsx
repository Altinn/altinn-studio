import React, { useState } from 'react';
import classes from './ThreeDotsMenu.module.css';
import { TabsIcon } from '@navikt/aksel-icons';
import { useTranslation } from 'react-i18next';
import { repositoryPath } from 'app-shared/api/paths';
import { GiteaIcon } from 'app-shared/icons';
import { LegacyPopover, Button } from '@digdir/design-system-react';
import { MenuElipsisVerticalIcon } from '@navikt/aksel-icons';
import { CloneModal } from './CloneModal';

type ThreeDotsMenuProps = {
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

  return (
    <>
      <LegacyPopover
        className={classes.popover}
        trigger={
          <Button
            icon={<MenuElipsisVerticalIcon title='Gitea menu' />}
            variant='tertiary'
            color='inverted'
            size='small'
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
              <span>{t('dashboard.repository')}</span>
            </a>
          </li>
        </ul>
      </LegacyPopover>
      {hasCloneModal && <CloneModal anchorEl={cloneModalAnchor} onClose={closeCloneModal} />}
    </>
  );
};
