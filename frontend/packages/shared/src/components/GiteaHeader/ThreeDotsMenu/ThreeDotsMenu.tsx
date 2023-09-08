import React, { useState } from 'react';
import classes from './ThreeDotsMenu.module.css';
import { CogIcon, TabsIcon } from '@navikt/aksel-icons';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { repositoryPath } from 'app-shared/api/paths';
import { GiteaIcon } from 'app-shared/icons';
import { Popover, Button } from '@digdir/design-system-react';
import { MenuElipsisVerticalIcon } from '@navikt/aksel-icons';
import { CloneModal } from './CloneModal';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

type ThreeDotsMenuProps = {
  onlyShowRepository?: boolean;
  hasCloneModal?: boolean;
};

export const ThreeDotsMenu = ({
  onlyShowRepository = false,
  hasCloneModal = false,
}: ThreeDotsMenuProps) => {
  const [cloneModalAnchor, setCloneModalAnchor] = useState(null);
  const { org, app } = useStudioUrlParams();
  const { t } = useTranslation();
  const closeCloneModal = () => setCloneModalAnchor(null);
  const openCloneModal = (event: React.MouseEvent) => setCloneModalAnchor(event.currentTarget);

  return (
    <>
      <Popover
        className={classes.popover}
        trigger={
          <Button
            icon={<MenuElipsisVerticalIcon title='Gitea menu' />}
            variant='quiet'
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
          {!onlyShowRepository && (
            <li>
              <Link to={`/${org}/${app}/accesscontrol`} className={classes.link}>
                <span className={classes.iconWrapper}>
                  <CogIcon className={classes.icon} />
                </span>
                <span>{t('sync_header.settings')}</span>
              </Link>
            </li>
          )}
        </ul>
      </Popover>
      {hasCloneModal && <CloneModal anchorEl={cloneModalAnchor} onClose={closeCloneModal} />}
    </>
  );
};
