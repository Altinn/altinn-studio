import React from 'react';
import { StudioTableWithPagination } from '@studio/components/src/components/StudioTableWithPagination';
import { DateUtils } from '@studio/pure-functions';
import { RepositoryWithStarred } from '../../utils/repoUtils/repoUtils';
import { ActionLinks } from './ActionLinks';
import { FavoriteButton } from './FavoriteButton';

type NewRepoListProps = {
  repos: RepositoryWithStarred[];
};

export const NewRepoList = ({ repos }: NewRepoListProps): React.ReactElement => {
  const rows = [];

  repos?.map((repo) => {
    const row = [];

    row.push(
      <FavoriteButton repo={repo} />,
      repo.name,
      repo.owner.full_name || repo.owner.login,
      DateUtils.formatDateDDMMYYYY(repo.updated_at),
      repo.description,
      <ActionLinks repo={repo} />,
    );

    rows.push(row);
  });

  const columns = ['', 'Navn', 'Opprettet av', 'Sist Endret', 'Beskrivelse', ''];

  return (
    <StudioTableWithPagination
      columns={columns}
      rows={rows}
      size={'small'}
      initialRowsPerPage={1000}
    />
  );
};
