import React, { useState } from 'react';
import classes from './Dashboard.module.css';
import { PageSpinner } from 'app-shared/components';
import cn from 'classnames';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { SearchField } from '@altinn/altinn-design-system';
import { Button, ButtonSize, ButtonVariant } from '@digdir/design-system-react';
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
import { User } from 'app-shared/types/User';
import { Organization } from 'app-shared/types/Organization';
import { useStarredReposQuery } from '../../hooks/queries';
import { useSelectedContext } from 'dashboard/hooks/useSelectedContext';

type DashboardProps = {
  user: User;
  organizations: Organization[];
  disableDebounce?: boolean;
};

export const Dashboard = ({ user, organizations, disableDebounce }: DashboardProps) => {
  const { t } = useTranslation();
  const selectedContext = useSelectedContext();
  const { data: starredRepos = [], isLoading: isLoadingStarredRepos } = useStarredReposQuery();
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

  if (isLoadingStarredRepos) {
    return <PageSpinner text={t('dashboard.loading')} />;
  }

  return (
    <>
      <CenterContainer>
        <div className={classes.createServiceContainer}>
          <div className={classes.topBar}>
            <div className={classes.searchFieldContainer}>
              <div>
                <SearchField
                  id='search-repos'
                  label={t('dashboard.search')}
                  value={searchText}
                  onChange={handleChangeSearch}
                  onKeyDown={handleKeyDown}
                />
              </div>
              {searchText && (
                <Button
                  data-testid='clear-search-button'
                  className={classes.clearSearchButton}
                  aria-label={t('dashboard.clear_search')}
                  onClick={handleClearSearch}
                  icon={<XMarkIcon />}
                  variant={ButtonVariant.Quiet}
                  size={ButtonSize.Small}
                />
              )}
            </div>
            <Link
              to={'/' + selectedContext + '/new'}
              className={classes.newLink}
              onMouseEnter={handleNewLinkFocus}
              onMouseLeave={handleNewLinkFocusOut}
              data-testid={'dashboard.new_app'}
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
            <SearchResultReposList searchValue={debouncedSearchText} starredRepos={starredRepos} />
          ) : (
            <>
              <FavoriteReposList />
              <div>
                <OrgReposList
                  user={user}
                  organizations={organizations}
                  starredRepos={starredRepos}
                />
              </div>
              <DatamodelsReposList
                user={user}
                organizations={organizations}
                starredRepos={starredRepos}
              />
            </>
          )}
        </div>
      </CenterContainer>
      <Footer />
    </>
  );
};
