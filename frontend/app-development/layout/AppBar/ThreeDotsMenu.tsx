import React, { useState } from 'react';
import classes from './ThreeDotsMenu.module.css';
import { CogIcon, TabsIcon } from '@navikt/aksel-icons';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CloneModal } from 'app-development/layout/version-control/CloneModal';
import { repositoryPath } from 'app-shared/api/paths';
import { GiteaIcon } from 'app-shared/icons';
import { Popover } from '@digdir/design-system-react';

export function ThreeDotsMenu() {
  const [cloneModalAnchor, setCloneModalAnchor] = useState(null);
  const { org, app } = useParams();
  const { t } = useTranslation();
  const closeCloneModal = () => setCloneModalAnchor(null);
  const openCloneModal = (event: React.MouseEvent) => setCloneModalAnchor(event.currentTarget);

  return (
    <>
      <Popover
        className={classes.popover}
        trigger={(
          <button
            data-testid='menuBtn'
            className={classes.verticalDotsMenu}
          >
            &#8942;
          </button>
        )}
      >
        <ul className={classes.menuItems}>
          <li>
            <button onClick={openCloneModal} className={classes.link}>
              <span className={classes.iconWrapper}>
                <TabsIcon className={classes.icon} />
              </span>
              <span>{t('sync_header.clone')}</span>
            </button>
          </li>
          <li>
            <a href={repositoryPath(org, app)} className={classes.link}>
              <span className={classes.iconWrapper}>
                <GiteaIcon className={classes.icon + ' ' + classes.giteaIcon} />
              </span>
              <span>{t('dashboard.repository')}</span>
            </a>
          </li>
          <li>
            <Link to={`/${org}/${app}/accesscontrol`} className={classes.link}>
              <span className={classes.iconWrapper}>
                <CogIcon className={classes.icon} />
              </span>
              <span>{t('sync_header.settings')}</span>
            </Link>
          </li>
        </ul>
      </Popover>
      <CloneModal anchorEl={cloneModalAnchor} onClose={closeCloneModal} />
    </>
  );
}
