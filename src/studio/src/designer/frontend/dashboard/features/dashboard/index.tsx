import * as React from 'react';

import { FavoriteReposList } from './FavoriteReposList';
import { OrgReposList } from './OrgReposList';

export const Dashboard = () => {
  return (
    <div style={{ marginTop: '50px' }}>
      <FavoriteReposList />

      <div style={{ marginTop: '50px' }}>
        <OrgReposList />
      </div>
    </div>
  );
};
