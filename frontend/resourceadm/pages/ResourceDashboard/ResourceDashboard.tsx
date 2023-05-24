import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDebounce } from 'react-use';
import { CenterContainer } from '../../components/CenterContainer';
import { Footer } from '../../components/Footer';
// import { FavoriteReposList } from '../../components/FavoriteReposList'; // Context BUG
import { SearchResultReposList } from '../../components/SearchResultReposList';

import classes from './ResourceDashboard.module.css'; // Styling må redigeres: fra Dashboard
import cn from 'classnames';
import { useTranslation } from 'react-i18next';

import { SearchField } from '@altinn/altinn-design-system'; // fra Dashboard
import type { ChangeEvent, KeyboardEvent } from 'react'; // fra Dashboard
import { Button, ButtonSize, ButtonVariant } from '@digdir/design-system-react'; // fra Dashboard
import { XMarkIcon } from '@navikt/aksel-icons'; // fra Dashboard

import { User } from '../../services/userService';
import { Organization } from '../../services/organizationService';

import { useGetStarredRepos } from '../../hooks/useRepoQueries'; // for tidlig
// import { useGetStarredRepos } from 'dashboard/hooks/useRepoQueries';


type ResourceDashboardProps = {
  user: User;
  organizations: Organization[];
  disableDebounce?: boolean;
};

export const ResourceDashboard = ({
  user,
  organizations,
  disableDebounce,
}: ResourceDashboardProps) => {
  const { data: starredRepos = [], isLoading: isLoadingStarredRepos } = useGetStarredRepos();

  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [isNewLinkFocused, setIsNewLinkFocused] = useState(false);

  const [debouncedSearchText, setDebouncedSearchText] = useState(''); // brukt for dynamisk søk
  useDebounce(() => setDebouncedSearchText(searchText), disableDebounce ? 1 : 500, [searchText]);

  const handleChangeSearch = (event: ChangeEvent<HTMLInputElement>) =>
    setSearchText(event.target.value);

  const handleClearSearch = () => setSearchText('');
  const handleKeyDown = (event: KeyboardEvent) => event.code === 'Escape' && setSearchText('');
  const handleNewLinkFocus = () => setIsNewLinkFocused(true);
  const handleNewLinkFocusOut = () => setIsNewLinkFocused(false);

  return (
    <>
      <CenterContainer>
        <div className={classes.topBar}>
          <div className={classes.searchFieldContainer}>
            <div>
              <SearchField
                id='search-repos'
                label='Søk etter ressurs'
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
            to={'/skatt/dummy1'}
            className={classes.newLink}
            onMouseEnter={handleNewLinkFocus}
            onMouseLeave={handleNewLinkFocusOut}
            data-testid={'dashboard.new_app'}
          >
            <span>Ny ressurs</span>
            <i
              className={cn('fa', classes.plusIcon, {
                'fa-circle-plus': isNewLinkFocused,
                'fa-circle-plus-outline': !isNewLinkFocused,
              })}
            />
          </Link>
        </div>

        <h3> Dette er RessursDashboard side pakket inn i TestPage </h3>

        <h5> bygger gradvis fra Dashboard mal. PageLayout krasjet i oppdatering 16.05.23</h5>

        <div>
          User er nå : {user.login}
          <br></br>
          Orgs[0].length og .username (sikret mot null) :{' '}
          {organizations[0] && (
            <div>
              {organizations.length} <br></br>
              {organizations[0].username}
            </div>
          )}
        </div>

        <h5> Vi ønsker listefunksjonalitet her, som i RepoList og OrgRepoList, </h5>
        <h5> og Repolist kan være et testsystem for å forstå repo bedre.</h5>
        <h5> Trenger jo repo for siden generelt sett. Her kan også datastruktur bestemme.</h5>
        <h5> Mulig at SearchResultReposList er en inngangsport også.</h5>

        <div className={classes.repoList}>
          Testtekst rød: er inni egen div .repoList og css. RepoList inn her.<br></br>
          Prøver få inn noe starred greier her: <br></br>
          {isLoadingStarredRepos && <h6>isLoadingStarredRepos er positiv her</h6>}
          {!isLoadingStarredRepos && (
            <div>
              <h6>isLoadingStarredRepos er negativ her</h6>
              <h6>Prøver få ut starredRepos.length:</h6>
              {starredRepos.length}
            </div>
          )}
          Prøvde også FavoriteRepoList: Context BUG blokkerte<br></br>
          Prøver nå SearchResultReposList komponent:<br></br>
          {debouncedSearchText && (
            <SearchResultReposList searchValue={debouncedSearchText} starredRepos={starredRepos} />
          )}
        </div>
      </CenterContainer>
      <Footer />
    </>
  );
};
