import * as React from 'react';
import TextField from '@mui/material/TextField';

import { CreateNewService } from '../createService/createNewService';

import { FavoriteReposList } from './FavoriteReposList';
import { OrgReposList } from './OrgReposList';
import { SearchResult } from './Search';

export const Dashboard = () => {
  const [searchText, setSearchText] = React.useState('');

  const handleChangeSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
  };

  return (
    <div style={{ marginTop: '50px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}
      >
        <div>
          <TextField
            id='outlined-basic'
            label='Søk'
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

          <div style={{ marginTop: '50px' }}>
            <OrgReposList />
          </div>
        </>
      )}
    </div>
  );
};
