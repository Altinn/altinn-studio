import React, { useState, useEffect, useRef } from 'react';
import Classes from './ThreeDotsMenu.module.css';
import { Settings } from '@navikt/ds-icons';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaRegClone } from 'react-icons/fa';
import { CloneModal } from 'app-development/layout/version-control/CloneModal';
import { repositoryPath } from 'app-shared/api-paths';

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
    <>
      <button
        data-testid='menuBtn'
        className={Classes.verticalDotsMenu}
        onClick={handleButtonClick}
      >
        &#8942;
      </button>
      {isMenuOpen && (
        <div className={Classes.popover} ref={menuRef}>
          <div className={Classes.menuItems}>
            <div className={Classes.cloneMenuItem}>
              <Link onClick={openCloneModal} to={''}>
                <section className={Classes.section}>
                  <FaRegClone className={Classes.icon} />
                  <div className={Classes.cloneText}>{t('sync_header.clone')}</div>
                </section>
              </Link>
            </div>

            <div className={Classes.repoMenuItem}>
              <a
                className={'fa fa-gitea'}
                href={repositoryPath(org, app)}
                target='_blank'
                rel='noopener noreferrer'
              >
                <div className={Classes.repoText}>{t('dashboard.repository')}</div>
              </a>
            </div>

            <div className={Classes.settingMenuItem}>
              <Link to={`/${org}/${app}/accesscontrol`}>
                <section className={Classes.section}>
                  <Settings className={Classes.icon} />
                  <div className={Classes.settingText}>{t('sync_header.setting')}</div>
                </section>
              </Link>
            </div>
          </div>
        </div>
      )}
      <CloneModal anchorEl={cloneModalAnchor} onClose={closeCloneModal} />
    </>
  );
}
