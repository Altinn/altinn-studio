import * as React from 'react';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import { useDebounce } from 'react-use';

import { getLanguageFromKey } from 'app-shared/utils/language';
import { CreateNewService } from '../createService/createNewService';

import { useAppSelector } from 'common/hooks';

import { FavoriteReposList } from './FavoriteReposList';
import { OrgReposList } from './OrgReposList';
import { SearchResultReposList } from './SearchResultReposList';

export const Dashboard = () => {
  const language = useAppSelector((state) => state.language.language);
  const [searchText, setSearchText] = React.useState('');
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

  return (
    <div style={{ marginTop: '55px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}
      >
        <div>
          <TextField
            id='outlined-basic'
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
                      <i
                        className={'fa fa-exit'}
                        style={{ fontSize: 26, width: 26 }}
                      />
                    </IconButton>
                  )}
                </InputAdornment>
              ),
            }}
          />
        </div>

        <div>
          <CreateNewService />
        </div>
      </div>

      {debouncedSearchText ? (
        <SearchResultReposList searchValue={debouncedSearchText} />
      ) : (
        <>
          <FavoriteReposList />

          <div style={{ marginTop: '55px' }}>
            <OrgReposList />
          </div>
        </>
      )}
    </div>
  );
};
