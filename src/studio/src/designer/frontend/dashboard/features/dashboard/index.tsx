import * as React from 'react';
import TextField from '@mui/material/TextField';

import { getLanguageFromKey } from 'app-shared/utils/language';
import { CreateNewService } from '../createService/createNewService';

import { useAppSelector } from 'common/hooks';

import { FavoriteReposList } from './FavoriteReposList';
import { OrgReposList } from './OrgReposList';
import { SearchResult } from './Search';

export const Dashboard = () => {
  const language = useAppSelector((state) => state.language.language);
  const [searchText, setSearchText] = React.useState('');

  const handleChangeSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
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
          />
        </div>

        <div>
          <CreateNewService />
        </div>
      </div>

      {searchText ? (
        <SearchResult searchValue={searchText} />
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
