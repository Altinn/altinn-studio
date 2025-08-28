import { useAppInstanceDetailsQuery } from 'admin/hooks/queries/useAppInstanceDetailsQuery';
import type { Instance } from 'admin/types/Instance';
import {
  StudioField,
  StudioLabel,
  StudioSpinner,
  StudioDetails,
  StudioTag,
  StudioLink,
} from '@studio/components';
import { StudioError, StudioTabs } from '@studio/components-legacy';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateAndTime } from 'admin/utils/formatDateAndTime';
import { Button } from '@digdir/designsystemet-react';
import { instanceDataElementPath } from 'admin/utils/apiPaths';
import { ProcessHistory } from './ProcessHistory';
import { InstanceEvents } from './InstanceEvents';

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
  instance: Instance;
};

enum InstanceDataViewTabs {
  Info = 'info',
  DataModel = 'dataModel',
  Process = 'process',
  Events = 'events',
  Logs = 'logs',
}

const InstanceDataViewWithData = ({
  org,
  env,
  app,
  id,
  instance,
}: InstanceDataViewWithDataProps) => {
  const { t } = useTranslation();

  return (
    <StudioTabs defaultValue={InstanceDataViewTabs.Info}>
      <StudioTabs.List>
        <StudioTabs.Tab value={InstanceDataViewTabs.Info}>
          {t('Informasjon om instansen')}
        </StudioTabs.Tab>
        <StudioTabs.Tab value={InstanceDataViewTabs.DataModel}>{t('Datamodeller')}</StudioTabs.Tab>
        <StudioTabs.Tab value={InstanceDataViewTabs.Process}>{t('Prosess')}</StudioTabs.Tab>
        <StudioTabs.Tab value={InstanceDataViewTabs.Events}>{t('Events')}</StudioTabs.Tab>
        <StudioTabs.Tab value={InstanceDataViewTabs.Logs}>{t('Logger')}</StudioTabs.Tab>
      </StudioTabs.List>
      <StudioTabs.Content value={InstanceDataViewTabs.Info}>
        <LabelValue label={t('Instans ID')} value={instance.id} />
        <LabelValue label={t('Opprettet')} value={formatDateAndTime(instance.created)} />
        <LabelValue label={t('Opprettet av')} value={instance.createdBy} />
        <LabelValue label={t('Sist endret')} value={formatDateAndTime(instance.lastChanged)} />
        <LabelValue label={t('Sist endret av')} value={instance.lastChangedBy} />
        {instance.instanceOwner.organisationNumber && (
          <LabelValue label={t('Organisasjon')} value={instance.instanceOwner.organisationNumber} />
        )}
        {instance.instanceOwner.personNumber && (
          <LabelValue label={t('Person')} value={instance.instanceOwner.personNumber} />
        )}
      </StudioTabs.Content>
      <StudioTabs.Content value={InstanceDataViewTabs.DataModel}>
        {instance.data.map((dataElement) => (
          <StudioDetails key={dataElement.id}>
            <StudioDetails.Summary>
              {dataElement.id} <StudioTag>{dataElement.dataType}</StudioTag>
            </StudioDetails.Summary>
            <StudioDetails.Content>
              <LabelValue label={t('Data element ID')} value={dataElement.id} />
              <LabelValue label={t('Data type')} value={dataElement.dataType} />
              <LabelValue label={t('Opprettet')} value={formatDateAndTime(dataElement.created)} />
              <LabelValue label={t('Opprettet av')} value={dataElement.createdBy} />
              <LabelValue
                label={t('Sist endret')}
                value={formatDateAndTime(dataElement.lastChanged)}
              />
              <LabelValue label={t('Sist endret av')} value={dataElement.lastChangedBy} />
              <LabelValue label={t('Låst')} value={dataElement.locked ? 'Ja' : 'Nei'} />
              {!!dataElement.tags?.length && (
                <LabelValue label={t('Tagger')} value={dataElement.tags.join(', ')} />
              )}
              <LabelValue label={t('Størrelse')} value={dataElement.size / 1e3 + ' kb'} />
              {dataElement.filename && (
                <LabelValue label={t('Filnavn')} value={dataElement.filename} />
              )}
              <LabelValue label={t('Content type')} value={dataElement.contentType} />
              {dataElement.fileScanResult && dataElement.fileScanResult !== 'NotApplicable' && (
                <LabelValue label={t('File scan result')} value={dataElement.fileScanResult} />
              )}
              {dataElement.fileScanDetails && (
                <LabelValue label={t('File scan details')} value={dataElement.fileScanDetails} />
              )}
              <Button asChild>
                <StudioLink
                  icon='☠️ '
                  target='_blank'
                  rel='noreferrer'
                  href={instanceDataElementPath(org, env, app, id, dataElement.id)}
                  style={{ color: 'white' }}
                >
                  Last ned innhold
                </StudioLink>
              </Button>
            </StudioDetails.Content>
          </StudioDetails>
        ))}
      </StudioTabs.Content>
      <StudioTabs.Content value={InstanceDataViewTabs.Process}>
        <ProcessHistory org={org} env={env} app={app} instanceId={id} />
      </StudioTabs.Content>
      <StudioTabs.Content value={InstanceDataViewTabs.Events}>
        <InstanceEvents org={org} env={env} app={app} instanceId={id} />
      </StudioTabs.Content>
      <StudioTabs.Content value={InstanceDataViewTabs.Logs}></StudioTabs.Content>
    </StudioTabs>
  );
};

const LabelValue = ({ label, value }: { label: string; value: string }) => {
  const labelId = `label-${label}`;
  return (
    <StudioField>
      <StudioLabel id={labelId}>{label}</StudioLabel>
      <br />
      <span aria-labelledby={labelId}>{value}</span>
    </StudioField>
  );
};
