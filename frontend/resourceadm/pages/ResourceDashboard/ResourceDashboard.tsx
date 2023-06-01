import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CenterContainer } from '../../components/CenterContainer';
import { Footer } from '../../components/Footer';

import classes from './ResourceDashboard.module.css';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';

import { SearchField } from '@altinn/altinn-design-system';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { Button, ButtonSize, ButtonVariant } from '@digdir/design-system-react';
import { XMarkIcon } from '@navikt/aksel-icons';

import { User } from 'app-shared/types/User';
import { Organization } from 'app-shared/types/Organization';

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
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [isNewLinkFocused, setIsNewLinkFocused] = useState(false);

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
        <h5> Vi ønsker muligens listefunksjonalitet her, som i RepoList og OrgRepoList, </h5>

      </CenterContainer>
      <Footer />
    </>
  );
};
