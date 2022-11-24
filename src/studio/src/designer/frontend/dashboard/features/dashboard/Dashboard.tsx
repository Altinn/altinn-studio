import type { ChangeEvent, KeyboardEvent } from 'react';
import React, { useState } from 'react';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import { useDebounce } from 'react-use';
import cn from 'classnames';
import { Link } from 'react-router-dom';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { FavoriteReposList } from './FavoriteReposList';
import { OrgReposList } from './OrgReposList';
import { SearchResultReposList } from './SearchResultReposList';
import { useAppSelector } from '../../common/hooks';
import classes from './Dashboard.module.css';
import { DatamodelsReposList } from './DatamodelsRepoList';

export const Dashboard = () => {
  const language = useAppSelector((state) => state.language.language);
  const [searchText, setSearchText] = useState('');
  const [isNewLinkFocused, setIsNewLinkFocused] = useState(false);
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  useDebounce(() => setDebouncedSearchText(searchText), 500, [searchText]);
  const handleChangeSearch = (event: ChangeEvent<HTMLInputElement>) =>
    setSearchText(event.target.value);
  const handleKeyDown = (event: KeyboardEvent) => event.code === 'Escape' && setSearchText('');
  const handleClearSearch = () => setSearchText('');
  const handleNewLinkFocus = () => setIsNewLinkFocused(true);
  const handleNewLinkFocusOut = () => setIsNewLinkFocused(false);
  return (
    <div className={classes.createServiceContainer}>
      <div className={classes.topBar}>
        <TextField
          id='search-repos'
          label={getLanguageFromKey('dashboard.search', language)}
          variant='outlined'
          value={searchText}
          onChange={handleChangeSearch}
          onKeyDown={handleKeyDown}
          InputProps={{
            endAdornment: (
              <InputAdornment position='end'>
                {searchText && (
                  <IconButton
                    aria-label={getLanguageFromKey('dashboard.clear_search', language)}
                    onClick={handleClearSearch}
                    edge='end'
                  >
                    <i className={cn('fa fa-exit', classes.clearIcon)} />
                  </IconButton>
                )}
              </InputAdornment>
            ),
          }}
        />
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
          <div className={classes.marginTop}>
            <OrgReposList />
          </div>
          <DatamodelsReposList />
        </>
      )}
    </div>
  );
};
