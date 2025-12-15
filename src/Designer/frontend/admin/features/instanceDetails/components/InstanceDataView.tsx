import { useAppInstanceDetailsQuery } from 'admin/hooks/queries/useAppInstanceDetailsQuery';
import {
  StudioField,
  StudioLabel,
  StudioSpinner,
  StudioDetails,
  StudioTag,
  StudioError,
  StudioTabs,
} from '@studio/components';
import type { ReactNode } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateAndTime } from 'admin/utils/formatDateAndTime';
// import { ProcessHistory } from './ProcessHistory';
// import { InstanceEvents } from './InstanceEvents';
import type { SimpleInstanceDetails } from 'admin/types/SimpleInstanceDetails';
import { InstanceStatus } from 'admin/features/instances/components/InstanceStatus';

type InstanceDataViewProps = {
  org: string;
  env: string;
  app: string;
  id: string;
};

export const InstanceDataView = ({ org, env, app, id }: InstanceDataViewProps) => {
  const { data, status } = useAppInstanceDetailsQuery(org, env, app, id);
  const { t } = useTranslation();

  switch (status) {
    case 'pending':
      return <StudioSpinner aria-label={t('general.loading')} />;
    case 'error':
      return <StudioError>{t('general.page_error_title')}</StudioError>;
    case 'success':
      return <InstanceDataViewWithData org={org} env={env} app={app} id={id} instance={data} />;
  }
};

type InstanceDataViewWithDataProps = InstanceDataViewProps & {
  instance: SimpleInstanceDetails;
};

enum InstanceDataViewTabs {
  Info = 'info',
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
}: InstanceDataViewWithDataProps) => {
  const { t } = useTranslation();

  return (
    <StudioTabs defaultValue={InstanceDataViewTabs.Info}>
      <StudioTabs.List>
        <StudioTabs.Tab value={InstanceDataViewTabs.Info}>
          {t('Informasjon om instansen')}
        </StudioTabs.Tab>
        {/*
        <StudioTabs.Tab value={InstanceDataViewTabs.Process}>{t('Prosess')}</StudioTabs.Tab>
        <StudioTabs.Tab value={InstanceDataViewTabs.Events}>{t('Events')}</StudioTabs.Tab>
        <StudioTabs.Tab value={InstanceDataViewTabs.Logs}>{t('Logger')}</StudioTabs.Tab>
           */}
      </StudioTabs.List>
      <StudioTabs.Panel value={InstanceDataViewTabs.Info}>
        <LabelValue label={t('Instans ID')} value={instance.id} />
        {(instance.currentTaskName || instance.currentTaskId) && (
          <LabelValue
            label={t('Prosessteg')}
            value={instance.currentTaskName ?? instance.currentTaskId}
          />
        )}
        <LabelValue label={t('Status')} value={<InstanceStatus instance={instance} />} />
        <LabelValue label={t('Opprettet')} value={formatDateAndTime(instance.createdAt)} />
        <LabelValue label={t('Sist endret')} value={formatDateAndTime(instance.lastChangedAt)} />

        <br />
        <strong>Dataelementer:</strong>
        {instance.data?.map((dataElement) => (
          <StudioDetails key={dataElement.id}>
            <StudioDetails.Summary>
              {dataElement.id} <StudioTag>{dataElement.dataType}</StudioTag>
            </StudioDetails.Summary>
            <StudioDetails.Content>
              <LabelValue label={t('Data element ID')} value={dataElement.id} />
              <LabelValue label={t('Data type')} value={dataElement.dataType} />
              <LabelValue label={t('Opprettet')} value={formatDateAndTime(dataElement.createdAt)} />
              <LabelValue
                label={t('Sist endret')}
                value={formatDateAndTime(dataElement.lastChangedAt)}
              />
              <LabelValue label={t('Låst')} value={dataElement.locked ? 'Ja' : 'Nei'} />
              <LabelValue label={t('Størrelse')} value={dataElement.size / 1e3 + ' kb'} />
              <LabelValue label={t('Content type')} value={dataElement.contentType} />
              {dataElement.fileScanResult && dataElement.fileScanResult !== 'NotApplicable' && (
                <LabelValue label={t('File scan result')} value={dataElement.fileScanResult} />
              )}
            </StudioDetails.Content>
          </StudioDetails>
        ))}
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

const LabelValue = ({ label, value }: { label: string; value: ReactNode }) => {
  const labelId = `label-${label}`;
  return (
    <StudioField>
      <StudioLabel id={labelId}>{label}</StudioLabel>
      <br />
      <span aria-labelledby={labelId}>{value}</span>
    </StudioField>
  );
};
