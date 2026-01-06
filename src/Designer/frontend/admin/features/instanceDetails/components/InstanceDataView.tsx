import { useAppInstanceDetailsQuery } from 'admin/hooks/queries/useAppInstanceDetailsQuery';
import {
  StudioField,
  StudioLabel,
  StudioSpinner,
  StudioDetails,
  StudioError,
  StudioTabs,
} from '@studio/components';
import type { PropsWithChildren } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateAndTime } from 'admin/utils/formatDateAndTime';
// import { ProcessHistory } from './ProcessHistory';
// import { InstanceEvents } from './InstanceEvents';
import type { SimpleDataElement, SimpleInstanceDetails } from 'admin/types/SimpleInstanceDetails';
import { InstanceStatus } from 'admin/features/instances/components/InstanceStatus';
import { useAppMetadataQuery } from 'admin/hooks/queries/useAppMetadataQuery';
import { useReduceQueries } from 'admin/hooks/useReduceQueries';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { Tag } from '@digdir/designsystemet-react';
import { useQueryParamState } from 'admin/hooks/useQueryParamState';
import { FileIcon, FileTextIcon, ReceiptIcon } from '@studio/icons';

import classes from './InstanceDataView.module.css';

type InstanceDataViewProps = {
  org: string;
  env: string;
  app: string;
  id: string;
};

export const InstanceDataView = ({ org, env, app, id }: InstanceDataViewProps) => {
  const { t } = useTranslation();

  const { data, status } = useReduceQueries(
    useAppInstanceDetailsQuery(org, env, app, id),
    useAppMetadataQuery(org, env, app),
  );

  switch (status) {
    case 'pending':
      return <StudioSpinner aria-label={t('general.loading')} />;
    case 'error':
      return <StudioError>{t('general.page_error_title')}</StudioError>;
    case 'success': {
      const [instanceDetails, appMetadata] = data;

      return (
        <InstanceDataViewWithData
          org={org}
          env={env}
          app={app}
          id={id}
          instance={instanceDetails}
          appMetadata={appMetadata}
        />
      );
    }
  }
};

type InstanceDataViewWithDataProps = InstanceDataViewProps & {
  instance: SimpleInstanceDetails;
  appMetadata: ApplicationMetadata;
};

enum InstanceDataViewTabs {
  Info = 'info',
  Data = 'data',
  Process = 'process',
  Events = 'events',
  Logs = 'logs',
}

const InstanceDataViewWithData = ({
  // org,
  // env,
  // app,
  // id,
  instance,
  appMetadata,
}: InstanceDataViewWithDataProps) => {
  const { t } = useTranslation();
  const [tab, setTab] = useQueryParamState<string>('section', InstanceDataViewTabs.Info);

  return (
    <StudioTabs value={tab} onChange={setTab}>
      <StudioTabs.List>
        <StudioTabs.Tab value={InstanceDataViewTabs.Info}>
          {t('Informasjon om instansen')}
        </StudioTabs.Tab>
        <StudioTabs.Tab value={InstanceDataViewTabs.Data}>{t('Dataelementer')}</StudioTabs.Tab>
        {/*
        <StudioTabs.Tab value={InstanceDataViewTabs.Process}>{t('Prosess')}</StudioTabs.Tab>
        <StudioTabs.Tab value={InstanceDataViewTabs.Events}>{t('Events')}</StudioTabs.Tab>
        <StudioTabs.Tab value={InstanceDataViewTabs.Logs}>{t('Logger')}</StudioTabs.Tab>
           */}
      </StudioTabs.List>
      <StudioTabs.Panel value={InstanceDataViewTabs.Info}>
        <LabelValue label={t('Instans ID')}>{instance.id}</LabelValue>
        {(instance.currentTaskName || instance.currentTaskId) && (
          <LabelValue label={t('Prosessteg')}>
            {instance.currentTaskName ?? instance.currentTaskId}
          </LabelValue>
        )}
        <LabelValue label={t('Status')}>{<InstanceStatus instance={instance} />}</LabelValue>
        <LabelValue label={t('Opprettet')}>{formatDateAndTime(instance.createdAt)}</LabelValue>
        {instance.archivedAt && (
          <LabelValue label={t('admin.instances.status.completed')}>
            {formatDateAndTime(instance.archivedAt)}
          </LabelValue>
        )}
        {instance.confirmedAt && (
          <LabelValue label={t('admin.instances.status.confirmed')}>
            {formatDateAndTime(instance.confirmedAt)}
          </LabelValue>
        )}
        {instance.softDeletedAt && (
          <LabelValue label={t('admin.instances.status.deleted')}>
            {formatDateAndTime(instance.softDeletedAt)}
          </LabelValue>
        )}
        <LabelValue label={t('Sist endret')}>
          {formatDateAndTime(instance.lastChangedAt)}
        </LabelValue>
      </StudioTabs.Panel>
      <StudioTabs.Panel value={InstanceDataViewTabs.Data}>
        <DataElementGroups dataElements={instance.data} appMetadata={appMetadata} />
      </StudioTabs.Panel>
      {/*
      <StudioTabs.Panel value={InstanceDataViewTabs.Process}>
        <ProcessHistory org={org} env={env} app={app} instanceId={id} />
      </StudioTabs.Panel>
      <StudioTabs.Panel value={InstanceDataViewTabs.Events}>
        <InstanceEvents org={org} env={env} app={app} instanceId={id} />
      </StudioTabs.Panel>
      <StudioTabs.Panel value={InstanceDataViewTabs.Logs}></StudioTabs.Panel>
        */}
    </StudioTabs>
  );
};

const LabelValue = ({ label, children }: PropsWithChildren<{ label: string }>) => {
  const labelId = `label-${label}`;
  return (
    <StudioField>
      <StudioLabel id={labelId}>{label}</StudioLabel>
      <br />
      <span aria-labelledby={labelId}>{children}</span>
    </StudioField>
  );
};

const DataElementGroups = ({
  dataElements,
  appMetadata,
}: {
  dataElements?: SimpleDataElement[];
  appMetadata: ApplicationMetadata;
}) => {
  if (!dataElements) {
    return null;
  }

  const dataElementGroups: Record<string, SimpleDataElement[]> = dataElements.reduce(
    (dataTypes, dataElement) => {
      dataTypes[dataElement.dataType] ??= [];
      dataTypes[dataElement.dataType].push(dataElement);
      return dataTypes;
    },
    {},
  );

  const sortedDataElementGroups = Object.entries(dataElementGroups).sort(([_a, aE], [_b, bE]) => {
    const a = Math.max(...aE.map((e) => new Date(e.lastChangedAt ?? '').getTime()));
    const b = Math.max(...bE.map((e) => new Date(e.lastChangedAt ?? '').getTime()));

    return a - b;
  });

  return sortedDataElementGroups.map(([dataType, elements]) => (
    <DataElementGroup
      key={dataType}
      dataType={dataType}
      dataElements={elements}
      appMetadata={appMetadata}
    />
  ));
};

const DataElementGroup = ({
  dataType,
  dataElements,
  appMetadata,
}: {
  dataType: string;
  dataElements: SimpleDataElement[];
  appMetadata: ApplicationMetadata;
}) => {
  const { t } = useTranslation();

  const dataTypeDef = appMetadata.dataTypes?.find((dt) => dt.id === dataType);

  // For datamodels there is usually exactly one element, looks weird to show the number in those cases
  const shouldShowCount = !(dataTypeDef?.minCount === 1 && dataTypeDef.maxCount === 1);
  const shouldShowMaxCount = !!dataTypeDef?.maxCount;
  const count = dataElements.length;
  const max = dataTypeDef?.maxCount;

  const labelId = `label-${dataType}`;
  const label =
    dataType === 'ref-data-as-pdf'
      ? `${t('Generert PDF')} (${count})`
      : shouldShowCount
        ? shouldShowMaxCount
          ? `${dataType} (${count}/${max})`
          : `${dataType} (${count})`
        : dataType;

  // POC distinguish between different "types" of data types. e.g. data models, pdf receipts, attachments. In the future, signature and payments objects? Need info from bpmn to determine this.
  const Icon =
    dataType === 'ref-data-as-pdf'
      ? ReceiptIcon
      : dataTypeDef?.appLogic?.classRef
        ? FileTextIcon
        : FileIcon;

  return (
    <StudioField className={classes['data-element-field']}>
      <StudioLabel id={labelId}>
        <span className={classes['data-element-label-wrapper']}>
          <div className={classes['data-element-label-title']}>
            <Icon className={classes['data-element-icon']} />
            {label}
          </div>
          {dataTypeDef?.taskId && (
            <Tag size='sm' color='first'>
              {dataTypeDef.taskId}
            </Tag>
          )}
        </span>
      </StudioLabel>
      {dataElements.map((dataElement) => (
        <StudioDetails key={dataElement.id}>
          <StudioDetails.Summary>{dataElement.id}</StudioDetails.Summary>
          <StudioDetails.Content>
            <LabelValue label={t('Data element ID')}>{dataElement.id}</LabelValue>
            <LabelValue label={t('Data type')}>{dataElement.dataType}</LabelValue>
            <LabelValue label={t('Opprettet')}>
              {formatDateAndTime(dataElement.createdAt)}
            </LabelValue>
            <LabelValue label={t('Sist endret')}>
              {formatDateAndTime(dataElement.lastChangedAt)}
            </LabelValue>
            <LabelValue label={t('Låst')}>{dataElement.locked ? 'Ja' : 'Nei'}</LabelValue>
            <LabelValue label={t('Størrelse')}>{dataElement.size / 1e3 + ' KB'}</LabelValue>
            <LabelValue label={t('Content type')}>{dataElement.contentType}</LabelValue>
            {dataElement.fileScanResult && dataElement.fileScanResult !== 'NotApplicable' && (
              <LabelValue label={t('File scan result')}>{dataElement.fileScanResult}</LabelValue>
            )}
          </StudioDetails.Content>
        </StudioDetails>
      ))}
    </StudioField>
  );
};
