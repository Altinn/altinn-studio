import { Table } from '@digdir/design-system-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import classes from './RepoList.module.css';

export const HeaderRow = () => {
  const { t } = useTranslation();
  return (
    <Table.Row>
      <Table.HeaderCell className={classes.favoriteCell}></Table.HeaderCell>
      <Table.HeaderCell>{t('dashboard.name')}</Table.HeaderCell>
      <Table.HeaderCell>{t('dashboard.created_by')}</Table.HeaderCell>
      <Table.HeaderCell>{t('dashboard.last_modified')}</Table.HeaderCell>
      <Table.HeaderCell>{t('dashboard.description')}</Table.HeaderCell>
      <Table.HeaderCell></Table.HeaderCell>
    </Table.Row>
  );
};
