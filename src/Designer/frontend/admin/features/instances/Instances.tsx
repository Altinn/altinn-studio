import React from 'react';
import classes from './Instances.module.css';
import { Link, useParams } from 'react-router-dom';
import { InstancesTable } from './components/InstancesTable';
import { StudioBreadcrumbs } from '@studio/components';
import { ArchiveReferenceSearch } from './components/ArchiveReferenceSearch';
import { StatusFilter } from './components/StatusFilter';
import { useQueryParamState } from 'admin/hooks/useQueryParamState';
import { ProcessTaskFilter } from './components/ProcessTaskFilter';
import { useTranslation } from 'react-i18next';

const YES_NO_ALL_OPTIONS = [
  { label: 'admin.instances.filter.all', value: undefined },
  { label: 'admin.instances.filter.yes', value: true },
  { label: 'admin.instances.filter.no', value: false },
];

const CREATED_BEFORE_OPTIONS = [
  { label: 'admin.instances.filter.all', value: undefined },
  ...[14, 30, 60].map((days) => ({
    label: 'admin.instances.created_option',
    labelParams: { days },
    value: days,
  })),
];

function getCurrentDateOnlyStringMinusDays(days: number | undefined) {
  if (days === undefined) {
    return undefined;
  }
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export const Instances = () => {
  const { t } = useTranslation();
  const { org, env, app } = useParams() as { org: string; env: string; app: string };
  const [archiveReference, setArchiveReference] = useQueryParamState<string>(
    'archiveReference',
    undefined,
  );
  const [currentTask, setCurrentTask] = useQueryParamState<string>('currentTask', undefined);
  const [isArchived, setIsArchived] = useQueryParamState<boolean>('isArchived', undefined);
  const [isConfirmed, setIsConfirmed] = useQueryParamState<boolean>('isConfirmed', undefined);
  const [isSoftDeleted, setIsSoftDeleted] = useQueryParamState<boolean>('isSoftDeleted', undefined);
  const [createdBeforeDays, setCreatedBeforeDays] = useQueryParamState<number>(
    'createdBeforeDays',
    undefined,
  );

  return (
    <div>
      <StudioBreadcrumbs>
        <StudioBreadcrumbs.Link>{app}</StudioBreadcrumbs.Link>
        <StudioBreadcrumbs.List>
          <StudioBreadcrumbs.Item>
            <StudioBreadcrumbs.Link asChild>
              <Link to={`/${org}/apps`}>{t('admin.apps.title')}</Link>
            </StudioBreadcrumbs.Link>
          </StudioBreadcrumbs.Item>
          <StudioBreadcrumbs.Item>
            <StudioBreadcrumbs.Link asChild>
              <Link to={`/${org}/apps/${env}/${app}`}>{app}</Link>
            </StudioBreadcrumbs.Link>
          </StudioBreadcrumbs.Item>
          <StudioBreadcrumbs.Item>
            <StudioBreadcrumbs.Link asChild>
              <Link to=''>{t('admin.instances.title')}</Link>
            </StudioBreadcrumbs.Link>
          </StudioBreadcrumbs.Item>
        </StudioBreadcrumbs.List>
      </StudioBreadcrumbs>
      <h1>
        {env} / {app} / {t('admin.instances.title')}
      </h1>
      <div className={classes.filterWrapper}>
        <ArchiveReferenceSearch value={archiveReference} setValue={setArchiveReference} />
        <ProcessTaskFilter
          org={org}
          env={env}
          app={app}
          value={currentTask}
          setValue={setCurrentTask}
        />
        <StatusFilter
          label='admin.instances.status.completed'
          value={isArchived}
          setValue={setIsArchived}
          options={YES_NO_ALL_OPTIONS}
        />
        <StatusFilter
          label='admin.instances.status.confirmed'
          value={isConfirmed}
          setValue={setIsConfirmed}
          options={YES_NO_ALL_OPTIONS}
        />
        <StatusFilter
          label='admin.instances.status.deleted'
          value={isSoftDeleted}
          setValue={setIsSoftDeleted}
          options={YES_NO_ALL_OPTIONS}
        />
        <StatusFilter
          label='admin.instances.created_before'
          value={createdBeforeDays}
          setValue={setCreatedBeforeDays}
          options={CREATED_BEFORE_OPTIONS}
        />
      </div>
      <InstancesTable
        org={org}
        env={env}
        app={app}
        currentTask={currentTask}
        isArchived={isArchived}
        archiveReference={archiveReference}
        confirmed={isConfirmed}
        isSoftDeleted={isSoftDeleted}
        createdBefore={getCurrentDateOnlyStringMinusDays(createdBeforeDays)}
      />
    </div>
  );
};
