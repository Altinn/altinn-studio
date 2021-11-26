import * as React from 'react';

import { FavoriteReposList } from './FavoriteReposList';
import { UserReposList } from './UserReposList';
import { OrgReposList } from './OrgReposList';

import { useAppSelector } from 'common/hooks';
import { SelectedContextType } from 'app-shared/navigation/main-header/Header';

export const Dashboard = () => {
  const selectedContext = useAppSelector(
    (state) => state.dashboard.selectedContext,
  );

  return (
    <div style={{ marginTop: '100px' }}>
      <FavoriteReposList />

      {selectedContext === SelectedContextType.Self ? (
        <UserReposList />
      ) : (
        <OrgReposList />
      )}
    </div>
  );
};
