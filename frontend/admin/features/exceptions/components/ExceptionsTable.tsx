import { StudioSelect, StudioSpinner, StudioTable } from '@studio/components';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioError, StudioSearch } from '@studio/components-legacy';
import { Link } from 'react-router-dom';
import type { SimpleInstance } from 'admin/types/SimpleInstance';
import { formatDateAndTime } from 'admin/utils/formatDateAndTime';
import { useAppExceptionsQuery } from 'admin/hooks/queries/useAppExceptionsQuery';
import type { AppException } from 'admin/types/AppException';

type InstancesTableProps = {
  org: string;
  env: string;
  app: string;
};

export const ExceptionsTable = ({ org, env, app }: InstancesTableProps) => {
  const [time, setTime] = useState('24');
  const handleTime = (value) => {
    setTime(value);
  };

  return (
    <div>
      <StudioSelect
        style={{ width: '200px', marginBottom: '20px' }}
        label={'Time'}
        // description={'Time'}
        value={time}
        onChange={(e) => handleTime(e.target.value)}
      >
        <StudioSelect.Option value='1'>1t</StudioSelect.Option>
        <StudioSelect.Option value='6'>6t</StudioSelect.Option>
        <StudioSelect.Option value='12'>12t</StudioSelect.Option>
        <StudioSelect.Option value='24'>1d</StudioSelect.Option>
        <StudioSelect.Option value='72'>3d</StudioSelect.Option>
        <StudioSelect.Option value='168'>7d</StudioSelect.Option>
        <StudioSelect.Option value='720'>30d</StudioSelect.Option>
      </StudioSelect>
      <ExceptionsTable1 org={org} env={env} app={app} time={time} />
    </div>
  );
};

type InstancesTableProps1 = {
  org: string;
  env: string;
  app: string;
  time: string;
};

export const ExceptionsTable1 = ({ org, env, app, time }: InstancesTableProps1) => {
  const { data, status } = useAppExceptionsQuery(org, env, app, time);
  const { t } = useTranslation();

  switch (status) {
    case 'pending':
      return <StudioSpinner aria-label={t('general.loading')} />;
    case 'error':
      return <StudioError>{t('general.page_error_title')}</StudioError>;
    case 'success':
      return <ErrorsTableWithData errors={data} />;
  }
};

type InstancesTableWithDataProps = {
  errors: AppException[];
};

const ErrorsTableWithData = ({ errors }: InstancesTableWithDataProps) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  return (
    <StudioTable zebra data-color='brand1'>
      <StudioTable.Head>
        <StudioTable.Row>
          <StudioTable.Cell>{t('Time')}</StudioTable.Cell>
          <StudioTable.Cell>{t('Message')}</StudioTable.Cell>
        </StudioTable.Row>
      </StudioTable.Head>
      <StudioTable.Body>
        {errors.map((error) => (
          <StudioTable.Row key={error.timeGenerated + error.details}>
            <StudioTable.Cell>{formatDateAndTime(error.timeGenerated)}</StudioTable.Cell>
            <StudioTable.Cell>{error.details}</StudioTable.Cell>
          </StudioTable.Row>
        ))}
      </StudioTable.Body>
    </StudioTable>
  );

  /*

  const instancesFiltered = errors.filter(
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

  */
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
