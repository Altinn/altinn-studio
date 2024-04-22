import { Table } from '@digdir/design-system-react';
import React from 'react';
import classes from './RepoList.module.css';
import { BodyRow } from './BodyRow';
import { RepositoryWithStarred } from '../../utils/repoUtils/repoUtils';
import { HeaderRow } from './HeaderRow';

export const NewRepoList = ({ repos }) => {
  return (
    <Table size='small' className={classes.repoList}>
      <Table.Head>
        <HeaderRow />
      </Table.Head>
      <Table.Body>
        {repos?.map((repo: RepositoryWithStarred) => <BodyRow key={repo.id} repo={repo} />)}
      </Table.Body>
    </Table>
  );
};
