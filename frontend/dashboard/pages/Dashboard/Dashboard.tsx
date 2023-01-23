import React, { useState } from 'react';
import classes from './Dashboard.module.css';
import cn from 'classnames';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { SearchField } from '@altinn/altinn-design-system';
import { Button, ButtonSize, ButtonVariant } from '@digdir/design-system-react';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { Close } from '@navikt/ds-icons';
import { CenterContainer } from '../../components/CenterContainer';
import { DatamodelsReposList } from '../../components/DataModelsRepoList';
import { OrgReposList } from '../../components/OrgRepoList';
import { SearchResultReposList } from '../../components/SearchResultReposList';
import { FavoriteReposList } from '../../components/FavoriteReposList';
import { Footer } from '../../components/Footer';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useDebounce } from 'react-use';

type DashboardProps = {
  disableDebounce?: boolean;
};

export const Dashboard = ({ disableDebounce }: DashboardProps) => {
  const language = useAppSelector((state) => state.language.language);
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
              <div>
                <SearchField
                  id='search-repos'
                  label={getLanguageFromKey('dashboard.search', language)}
                  value={searchText}
                  onChange={handleChangeSearch}
                  onKeyDown={handleKeyDown}
                />
              </div>
              {searchText && (
                <Button
                  data-testid='clear-search-button'
                  className={classes.clearSearchButton}
                  aria-label={getLanguageFromKey('dashboard.clear_search', language)}
                  onClick={handleClearSearch}
                  icon={<Close />}
                  variant={ButtonVariant.Quiet}
                  size={ButtonSize.Small}
                />
              )}
            </div>
            <Link
              to='/new'
              className={classes.newLink}
              onMouseEnter={handleNewLinkFocus}
              onMouseLeave={handleNewLinkFocusOut}
              data-testid={'dashboard.new_app'}
            >
              <span>{getLanguageFromKey('dashboard.new_service', language)}</span>
              <i
                className={cn('fa', classes.plusIcon, {
                  'fa-circle-plus': isNewLinkFocused,
                  'fa-circle-plus-outline': !isNewLinkFocused
                })}
              />
            </Link>
          </div>

          {debouncedSearchText ? (
            <SearchResultReposList searchValue={debouncedSearchText} />
          ) : (
            <>
              <FavoriteReposList />
              <div className={classes.marginTop}>
                <OrgReposList />
              </div>
              <DatamodelsReposList />
            </>
          )}
        </div>
      </CenterContainer>
      <Footer />
    </>
  );
};
