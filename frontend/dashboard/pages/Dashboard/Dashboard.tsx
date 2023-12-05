import React, { useState } from 'react';
import classes from './Dashboard.module.css';
import { StudioPageSpinner } from '@studio/components';
import cn from 'classnames';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { SearchField } from '@altinn/altinn-design-system';
import { Button } from '@digdir/design-system-react';
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
import * as testids from '../../../testing/testids';
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
  const { data: starredRepos = [], isPending: areStarredReposPending } = useStarredReposQuery();
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

  if (areStarredReposPending) {
    return <StudioPageSpinner />;
  }

  return (
    <>
      <CenterContainer>
        <div className={classes.createServiceContainer}>
          <div className={classes.topBar}>
            <div className={classes.searchFieldContainer}>
              <div data-testid={testids.searchReposField}>
                <SearchField
                  // Todo: Replace this with a component from the common design system when it is ready.
                  // Until then we must use the test id here because this component is not correctly labeled.
                  label={t('dashboard.search')}
                  value={searchText}
                  onChange={handleChangeSearch}
                  onKeyDown={handleKeyDown}
                />
              </div>
              {searchText && (
                <Button
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
