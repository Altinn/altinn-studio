import React, { useState } from 'react';
import classes from './Dashboard.module.css';
import cn from 'classnames';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { Textfield } from '@digdir/design-system-react';
import { StudioButton } from '@studio/components';
import { XMarkIcon } from '@navikt/aksel-icons';
import { CenterContainer } from '../../components/CenterContainer';
import { DatamodelsReposList } from '../../components/DataModelsRepoList';
import { OrgReposList } from '../../components/OrgRepoList';
import { SearchResultReposList } from '../../components/SearchResultReposList';
import { FavoriteReposList } from '../../components/FavoriteReposList';
import { Footer } from '../../components/Footer';
import { Link } from 'react-router-dom';
import { useDebounce } from 'react-use';
import { useTranslation } from 'react-i18next';
import type { User } from 'app-shared/types/Repository';
import type { Organization } from 'app-shared/types/Organization';
import { useSelectedContext } from 'dashboard/hooks/useSelectedContext';
import { ResourcesRepoList } from 'dashboard/components/ResourcesRepoList/ResourcesRepoList';
import { SelectedContextType } from 'app-shared/navigation/main-header/Header';

type DashboardProps = {
  user: User;
  organizations: Organization[];
  disableDebounce?: boolean;
};

export const Dashboard = ({ user, organizations, disableDebounce }: DashboardProps) => {
  const { t } = useTranslation();
  const selectedContext = useSelectedContext();
  const [searchText, setSearchText] = useState('');
  const [isNewLinkFocused, setIsNewLinkFocused] = useState(false);
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  useDebounce(() => setDebouncedSearchText(searchText), disableDebounce ? 1 : 500, [searchText]);

  const handleChangeSearch = (event: ChangeEvent<HTMLInputElement>) =>
    setSearchText(event.target.value);

  const handleKeyDown = (event: KeyboardEvent) => event.code === 'Escape' && setSearchText('');
  const handleClearSearch = () => setSearchText('');
  const handleNewLinkFocus = () => setIsNewLinkFocused(true);
  const handleNewLinkFocusOut = () => setIsNewLinkFocused(false);

  return (
    <>
      <CenterContainer>
        <div className={classes.createServiceContainer}>
          <div className={classes.topBar}>
            <div className={classes.searchFieldContainer}>
              <Textfield
                label={t('dashboard.search')}
                value={searchText}
                onChange={handleChangeSearch}
                onKeyDown={handleKeyDown}
              />
              {searchText && (
                <StudioButton
                  className={classes.clearSearchButton}
                  aria-label={t('dashboard.clear_search')}
                  onClick={handleClearSearch}
                  icon={<XMarkIcon />}
                  variant='tertiary'
                  size='small'
                />
              )}
            </div>
            <Link
              to={'/' + selectedContext + '/new'}
              className={classes.newLink}
              onMouseEnter={handleNewLinkFocus}
              onMouseLeave={handleNewLinkFocusOut}
            >
              <span>{t('dashboard.new_service')}</span>
              <i
                className={cn('fa', classes.plusIcon, {
                  'fa-circle-plus': isNewLinkFocused,
                  'fa-circle-plus-outline': !isNewLinkFocused,
                })}
              />
            </Link>
          </div>

          {debouncedSearchText ? (
            <SearchResultReposList searchValue={debouncedSearchText} />
          ) : (
            <>
              <FavoriteReposList />
              <div>
                <OrgReposList user={user} organizations={organizations} />
              </div>
              <DatamodelsReposList user={user} organizations={organizations} />
              {selectedContext !== SelectedContextType.All &&
                selectedContext !== SelectedContextType.Self && (
                  <ResourcesRepoList user={user} organizations={organizations} />
                )}
            </>
          )}
        </div>
      </CenterContainer>
      <Footer />
    </>
  );
};
