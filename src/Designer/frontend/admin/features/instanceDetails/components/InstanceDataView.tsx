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
import type { PropsWithChildren } from 'react';
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
        <LabelValue label={t('Instans ID')}>{instance.id}</LabelValue>
        {(instance.currentTaskName || instance.currentTaskId) && (
          <LabelValue label={t('Prosessteg')}>
            {instance.currentTaskName ?? instance.currentTaskId}
          </LabelValue>
        )}
        <LabelValue label={t('Status')}>{<InstanceStatus instance={instance} />}</LabelValue>
        <LabelValue label={t('Opprettet')}>{formatDateAndTime(instance.createdAt)}</LabelValue>
        <LabelValue label={t('Sist endret')}>
          {formatDateAndTime(instance.lastChangedAt)}
        </LabelValue>
        {!!instance.data?.length && (
          <LabelValue label={t('Dataelementer')}>
            {instance.data?.map((dataElement) => (
              <StudioDetails key={dataElement.id}>
                <StudioDetails.Summary>
                  {dataElement.id} <StudioTag>{dataElement.dataType}</StudioTag>
                </StudioDetails.Summary>
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
                  <LabelValue label={t('Størrelse')}>{dataElement.size / 1e3 + ' kb'}</LabelValue>
                  <LabelValue label={t('Content type')}>{dataElement.contentType}</LabelValue>
                  {dataElement.fileScanResult && dataElement.fileScanResult !== 'NotApplicable' && (
                    <LabelValue label={t('File scan result')}>
                      {dataElement.fileScanResult}
                    </LabelValue>
                  )}
                </StudioDetails.Content>
              </StudioDetails>
            ))}
          </LabelValue>
        )}
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
