import { useAppInstanceDetailsQuery } from 'admin/hooks/queries/useAppInstanceDetailsQuery';
import {
  StudioField,
  StudioLabel,
  StudioSpinner,
  StudioDetails,
  StudioError,
  StudioCard,
  StudioHeading,
} from '@studio/components';
import React, { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateAndTime } from 'admin/utils/formatDateAndTime';
import type { SimpleDataElement, SimpleInstanceDetails } from 'admin/types/SimpleInstanceDetails';
import { InstanceStatus } from 'admin/features/instances/components/InstanceStatus';
import { useAppMetadataQuery } from 'admin/hooks/queries/useAppMetadataQuery';
import { useReduceQueries } from 'admin/hooks/useReduceQueries';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { Tag } from '@digdir/designsystemet-react';
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
import { LabelValue } from 'admin/components/LabelValue/LabelValue';

type InstanceDataViewProps = {
  org: string;
  environment: string;
  app: string;
  id: string;
};

export const InstanceDataView = ({ org, environment, app, id }: InstanceDataViewProps) => {
  const { t } = useTranslation();

  const { data, status } = useReduceQueries(
    useAppInstanceDetailsQuery(org, environment, app, id),
    useAppMetadataQuery(org, environment, app),
    useProcessMetadataQuery(org, environment, app),
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
          environment={environment}
          app={app}
          instance={instanceDetails}
          appMetadata={appMetadata}
          processMetadata={processMetadata}
        />
      );
    }
  }
};

type InstanceDataViewWithDataProps = {
  environment: string;
  app: string;
  instance: SimpleInstanceDetails;
  appMetadata: ApplicationMetadata;
  processMetadata: ProcessTaskMetadata[];
};

const InstanceDataViewWithData = ({
  environment,
  app,
  instance,
  appMetadata,
  processMetadata,
}: InstanceDataViewWithDataProps) => {
  const { t } = useTranslation();

  return (
    <>
      <StudioCard>
        <StudioHeading data-size='sm'>{t('admin.instances.info.title')}</StudioHeading>
        <div className={classes['info-wrapper']}>
          <LabelValue label={t('admin.environment')}>
            {t('admin.environment.name', { environment })}
          </LabelValue>
          <LabelValue label={t('admin.app')}>{app}</LabelValue>
          {(instance.currentTaskName || instance.currentTaskId) && (
            <LabelValue label={t('admin.instances.process_task')}>
              {instance.currentTaskName ?? instance.currentTaskId}
            </LabelValue>
          )}
          <LabelValue label={t('admin.instances.status')}>
            {<InstanceStatus instance={instance} />}
          </LabelValue>
          <LabelValue label={t('admin.instances.created')}>
            {formatDateAndTime(instance.createdAt)}
          </LabelValue>
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
          <LabelValue label={t('admin.instances.last_changed')}>
            {formatDateAndTime(instance.lastChangedAt)}
          </LabelValue>
        </div>
      </StudioCard>

      <StudioCard className={classes.cardFix}>
        <StudioHeading data-size='sm'>{t('admin.instances.data_elements')}</StudioHeading>
        <div className={classes['data-elements']}>
          <DataElementGroups
            dataElements={instance.data}
            appMetadata={appMetadata}
            processMetadata={processMetadata}
          />
        </div>
      </StudioCard>
    </>
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
  const labelId = useId();

  const type = getDataTypeType(dataType, appMetadata, processMetadata);
  const Icon = DataTypeIcons[type];
  const label = getDataTypeLabel(dataType, dataElements.length, appMetadata);
  const taskName = getTaskName(dataType, appMetadata, processMetadata);

  return (
    <StudioField>
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
          <StudioDetails.Content className={classes['data-element-details-wrapper']}>
            <LabelValue label={t('admin.instances.created')}>
              {formatDateAndTime(dataElement.createdAt)}
            </LabelValue>
            <LabelValue label={t('admin.instances.last_changed')}>
              {formatDateAndTime(dataElement.lastChangedAt)}
            </LabelValue>
            <LabelValue label={t('admin.instances.data.locked')}>
              {dataElement.locked ? 'Ja' : 'Nei'}
            </LabelValue>
            <LabelValue label={t('admin.instances.data.size')}>
              {t('admin.instances.data.size_kb', { size: (dataElement.size ?? 0) / 1e3 })}
            </LabelValue>
            <LabelValue label={t('admin.instances.data.content_type')}>
              {dataElement.contentType}
            </LabelValue>
            {dataElement.fileScanResult && dataElement.fileScanResult !== 'NotApplicable' && (
              <LabelValue label={t('admin.instances.data.file_scan_result')}>
                {dataElement.fileScanResult}
              </LabelValue>
            )}
          </StudioDetails.Content>
        </StudioDetails>
      ))}
    </StudioField>
  );
};
