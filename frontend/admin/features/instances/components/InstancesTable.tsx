import { StudioSpinner, StudioTable } from '@studio/components';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioError, StudioSearch } from '@studio/components-legacy';
import { Link } from 'react-router-dom';
import { useAppInstancesQuery } from 'admin/hooks/queries/useAppInstancesQuery';
import type { SimpleInstance } from 'admin/types/SimpleInstance';
import { formatDateAndTime } from 'admin/utils/formatDateAndTime';

type InstancesTableProps = {
  org: string;
  env: string;
  app: string;
};

export const InstancesTable = ({ org, env, app }: InstancesTableProps) => {
  const { data, status } = useAppInstancesQuery(org, env, app);
  const { t } = useTranslation();

  switch (status) {
    case 'pending':
      return <StudioSpinner aria-label={t('general.loading')} />;
    case 'error':
      return <StudioError>{t('general.page_error_title')}</StudioError>;
    case 'success':
      return <InstancesTableWithData instances={data} />;
  }
};

type InstancesTableWithDataProps = {
  instances: SimpleInstance[];
};

const InstancesTableWithData = ({ instances }: InstancesTableWithDataProps) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const instancesFiltered = instances.filter(
    (instance) => !search || instance.id.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <StudioSearch
        value={search}
        autoComplete='off'
        onChange={(e) => setSearch(e.target.value)}
        label={t('Søk på instans-ID')}
      />
      <StudioTable zebra>
        <StudioTable.Head>
          <StudioTable.Row>
            <StudioTable.Cell>{t('Id')}</StudioTable.Cell>
            <StudioTable.Cell>{t('Opprettet')}</StudioTable.Cell>
            <StudioTable.Cell>{t('Prosessteg')}</StudioTable.Cell>
            <StudioTable.Cell>{t('Status')}</StudioTable.Cell>
          </StudioTable.Row>
        </StudioTable.Head>
        <StudioTable.Body>
          {instancesFiltered.map((instance) => (
            <StudioTable.Row key={instance.id}>
              <StudioTable.Cell>
                <Link to={`${instance.id}`}>{instance.id}</Link>
              </StudioTable.Cell>
              <StudioTable.Cell>{formatDateAndTime(instance.createdAt)}</StudioTable.Cell>
              <StudioTable.Cell>{instance.currentTask ?? 'Avsluttet'}</StudioTable.Cell>
              <StudioTable.Cell>{getStatus(instance)}</StudioTable.Cell>
            </StudioTable.Row>
          ))}
        </StudioTable.Body>
      </StudioTable>
    </>
  );
};

// TODO: These may not be reducable to a single status?
function getStatus(instance: SimpleInstance) {
  switch (true) {
    case instance.isSoftDeleted:
    case instance.isHardDeleted:
      return 'Slettet';
    case instance.isConfirmed:
      return 'Bekreftet';
    case instance.isArchived:
      return 'Arkivert';
    case instance.isComplete:
      return 'Levert';
    default:
      return 'Aktiv';
  }
}
