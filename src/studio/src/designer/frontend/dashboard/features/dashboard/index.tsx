import * as React from 'react';
import { makeStyles, createTheme } from '@material-ui/core';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import { useDebounce } from 'react-use';
import cn from 'classnames';
import { Link } from 'react-router-dom';

import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import { getLanguageFromKey } from 'app-shared/utils/language';

import { useAppSelector } from 'common/hooks';

import { FavoriteReposList } from './FavoriteReposList';
import { OrgReposList } from './OrgReposList';
import { SearchResultReposList } from './SearchResultReposList';

const theme = createTheme(altinnTheme);

const useStyles = makeStyles(() => ({
  marginTop: {
    marginTop: 55,
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '24px',
    alignItems: 'center',
  },
  clearIcon: {
    fontSize: 26,
    width: 26,
  },
  plusIcon: {
    fontSize: 40,
    width: 40,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newLink: {
    color: theme.altinnPalette.primary.blueDarker,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 18,
    fontWeight: 500,

    '&:hover': {
      color: theme.altinnPalette.primary.blueDarker,
      textDecoration: 'none',
    },
    '&:hover span': {
      textDecoration: 'underline',
    },
  },
}));

export const Dashboard = () => {
  const classes = useStyles();
  const language = useAppSelector((state) => state.language.language);
  const [searchText, setSearchText] = React.useState('');
  const [isNewLinkFocused, setIsNewLinkFocused] = React.useState(false);
  const [debouncedSearchText, setDebouncedSearchText] = React.useState('');

  useDebounce(
    () => {
      setDebouncedSearchText(searchText);
    },
    500,
    [searchText],
  );

  const handleChangeSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.code === 'Escape') {
      setSearchText('');
    }
  };

  const handleClearSearch = () => {
    setSearchText('');
  };

  const handleNewLinkFocus = () => {
    setIsNewLinkFocused(true);
  };

  const handleNewLinkFocusOut = () => {
    setIsNewLinkFocused(false);
  };

  return (
    <div className={classes.marginTop}>
      <div className={classes.topBar}>
        <div>
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
                      aria-label={getLanguageFromKey(
                        'dashboard.clear_search',
                        language,
                      )}
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
        </div>

        <div>
          <Link
            to='/new'
            className={classes.newLink}
            onMouseEnter={handleNewLinkFocus}
            onMouseLeave={handleNewLinkFocusOut}
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
      </div>

      {debouncedSearchText ? (
        <SearchResultReposList searchValue={debouncedSearchText} />
      ) : (
        <>
          <FavoriteReposList />

          <div className={classes.marginTop}>
            <OrgReposList />
          </div>
        </>
      )}
    </div>
  );
};
