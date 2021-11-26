import * as React from 'react';

import { CreateNewService } from '../createService/createNewService';

import { FavoriteReposList } from './FavoriteReposList';
import { OrgReposList } from './OrgReposList';

export const Dashboard = () => {
  return (
    <div style={{ marginTop: '50px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <CreateNewService />
      </div>

      <FavoriteReposList />

      <div style={{ marginTop: '50px' }}>
        <OrgReposList />
      </div>
    </div>
  );
};
