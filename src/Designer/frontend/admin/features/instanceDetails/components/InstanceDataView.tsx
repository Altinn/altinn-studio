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
import {
  FileTextIcon,
  PaperclipIcon,
  PaymentDetailsIcon,
  PencilLineIcon,
  PersonPencilIcon,
  ReceiptIcon,
} from '@studio/icons';

import classes from './InstanceDataView.module.css';
import {
  type ProcessTaskMetadata,
  useProcessMetadataQuery,
} from 'admin/hooks/queries/useProcessMetadataQuery';

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
    useProcessMetadataQuery(org, env, app),
  );

  switch (status) {
    case 'pending':
      return <StudioSpinner aria-label={t('general.loading')} />;
    case 'error':
      return <StudioError>{t('general.page_error_title')}</StudioError>;
    case 'success': {
      const [instanceDetails, appMetadata, processMetadata] = data;

      return (
        <InstanceDataViewWithData
          org={org}
          env={env}
          app={app}
          id={id}
          instance={instanceDetails}
          appMetadata={appMetadata}
          processMetadata={processMetadata}
        />
      );
    }
  }
};

type InstanceDataViewWithDataProps = InstanceDataViewProps & {
  instance: SimpleInstanceDetails;
  appMetadata: ApplicationMetadata;
  processMetadata: ProcessTaskMetadata[];
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
  processMetadata,
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
        <DataElementGroups
          dataElements={instance.data}
          appMetadata={appMetadata}
          processMetadata={processMetadata}
        />
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
  processMetadata,
}: {
  dataElements?: SimpleDataElement[];
  appMetadata: ApplicationMetadata;
  processMetadata: ProcessTaskMetadata[];
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

  const sortedDataElementGroups = Object.entries(dataElementGroups)
    .toSorted(
      ([_a, aE], [_b, bE]) =>
        Math.max(...aE.map((e) => new Date(e.createdAt ?? 0).getTime())) -
        Math.max(...bE.map((e) => new Date(e.createdAt ?? 0).getTime())),
    )
    .map(
      ([dataType, elements]) =>
        [
          dataType,
          elements.toSorted(
            (a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime(),
          ),
        ] as const,
    );

  return sortedDataElementGroups.map(([dataType, elements]) => (
    <DataElementGroup
      key={dataType}
      dataType={dataType}
      dataElements={elements}
      appMetadata={appMetadata}
      processMetadata={processMetadata}
    />
  ));
};

type DataTypeType =
  | 'datamodel'
  | 'pdfReceipt'
  | 'signature'
  | 'signeeStates'
  | 'paymentInfo'
  | 'default';

const DataTypeIcons: { [k in DataTypeType]: React.FC } = {
  datamodel: () => <FileTextIcon title='Datamodell' className={classes['data-element-icon']} />,
  pdfReceipt: () => <ReceiptIcon title='PDF kvittering' className={classes['data-element-icon']} />,
  signature: () => <PencilLineIcon title='Signatur' className={classes['data-element-icon']} />,
  signeeStates: () => (
    <PersonPencilIcon title='Signatarer' className={classes['data-element-icon']} />
  ),
  paymentInfo: () => (
    <PaymentDetailsIcon title='Betaling' className={classes['data-element-icon']} />
  ),
  default: () => <PaperclipIcon title='Vedlegg' className={classes['data-element-icon']} />,
};

function getDataTypeType(
  dataType: string,
  appMetadata: ApplicationMetadata,
  processMetadata: ProcessTaskMetadata[],
): DataTypeType {
  const tag = processMetadata
    .flatMap((pm) => pm.dataTypeTags)
    .find((dtt) => dtt.dataTypeId === dataType)?.tag;

  if (
    dataType === 'ref-data-as-pdf' ||
    tag === 'signingPdfDataType' ||
    tag === 'paymentReceiptPdfDataType'
  ) {
    return 'pdfReceipt';
  }
  if (tag === 'signatureDataType') {
    return 'signature';
  }
  if (tag === 'signeeStatesDataTypeId') {
    return 'signeeStates';
  }
  if (tag === 'paymentDataType') {
    return 'paymentInfo';
  }
  if (appMetadata.dataTypes?.find((d) => d.id === dataType)?.appLogic?.classRef) {
    return 'datamodel';
  }
  return 'default';
}

function getDataTypeLabel(
  dataType: string,
  count: number,
  appMetadata: ApplicationMetadata,
): string {
  if (dataType === 'ref-data-as-pdf') {
    return `Generert PDF (${count})`;
  }

  const dataTypeDef = appMetadata.dataTypes?.find((dt) => dt.id === dataType);

  if (!dataTypeDef || (dataTypeDef.minCount === 1 && dataTypeDef.maxCount === 1)) {
    return dataType;
  }

  if (!!dataTypeDef.maxCount) {
    return `${dataType} (${count}/${dataTypeDef.maxCount})`;
  }

  return `${dataType} (${count})`;
}

function getTaskName(
  dataType: string,
  appMetadata: ApplicationMetadata,
  processMetadata: ProcessTaskMetadata[],
): string | undefined {
  const taskId = appMetadata.dataTypes?.find((dt) => dt.id === dataType)?.taskId;
  if (taskId) {
    return processMetadata.find((task) => task.id === taskId)?.name ?? taskId;
  }

  const processTaskMetadata = processMetadata.find((pm) =>
    pm.dataTypeTags.find((dtt) => dtt.dataTypeId === dataType),
  );
  return processTaskMetadata?.name ?? processTaskMetadata?.id;
}

const DataElementGroup = ({
  dataType,
  dataElements,
  appMetadata,
  processMetadata,
}: {
  dataType: string;
  dataElements: SimpleDataElement[];
  appMetadata: ApplicationMetadata;
  processMetadata: ProcessTaskMetadata[];
}) => {
  const { t } = useTranslation();
  const labelId = `label-${dataType}`;

  const type = getDataTypeType(dataType, appMetadata, processMetadata);
  const Icon = DataTypeIcons[type];
  const label = getDataTypeLabel(dataType, dataElements.length, appMetadata);
  const taskName = getTaskName(dataType, appMetadata, processMetadata);

  return (
    <StudioField className={classes['data-element-field']}>
      <StudioLabel id={labelId}>
        <span className={classes['data-element-label-wrapper']}>
          <div className={classes['data-element-label-title']}>
            <Icon />
            {label}
          </div>
          {taskName && (
            <Tag size='sm' color='first'>
              {taskName}
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
            <LabelValue label={t('Størrelse')}>{(dataElement.size ?? 0) / 1e3 + ' KB'}</LabelValue>
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
