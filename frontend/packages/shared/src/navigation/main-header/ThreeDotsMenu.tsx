import React, { useState, useEffect, useRef } from 'react';
import Classes from './ThreeDotsMenu.module.css';
import { Settings } from '@navikt/ds-icons';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CloneButton } from 'app-development/layout/version-control/CloneButton';
import { CloneModal } from 'app-development/layout/version-control/CloneModal';
import cn from 'classnames';

export function ThreeDotsMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [cloneModalAnchor, setCloneModalAnchor] = useState(null);

  const { org, app } = useParams();
  const { t } = useTranslation();
  const closeCloneModal = () => setCloneModalAnchor(null);
  const openCloneModal = (event: React.MouseEvent) => setCloneModalAnchor(event.currentTarget);

  function handleButtonClick() {
    setIsMenuOpen(!isMenuOpen);
  }

  function handleClickOutside(event) {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setIsMenuOpen(false);
    }
  }

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div>
      <button className={Classes.verticalDotsMenu} onClick={handleButtonClick}>
        &#8942;
      </button>
      {isMenuOpen && (
        <div className={Classes.popover} ref={menuRef}>
          <div className={Classes.menuItems}>
            <div className={Classes.cloneMenuItem}>
              <div>
                <CloneButton onClick={openCloneModal} buttonText={t('sync_header.clone')} />
              </div>
            </div>

            <div className={Classes.repoMenuItem}>
              <Link className={cn('fa fa-gitea')} to={`/${org}/${app}/repository`}>
                <div className={Classes.repoText}>{t('dashboard.repository')}</div>
              </Link>
            </div>

            <div className={Classes.settingMenuItem}>
              <Link to={`/${org}/${app}/accesscontrol`}>
                <div className={Classes.settingText}>
                  {' '}
                  <Settings /> {t('sync_header.setting')}
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      <CloneModal anchorEl={cloneModalAnchor} onClose={closeCloneModal} />
    </div>
  );
}
