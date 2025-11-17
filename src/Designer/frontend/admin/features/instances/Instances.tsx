import React from 'react';
import classes from './Instances.module.css';
import { Link, useParams } from 'react-router-dom';
import { InstancesTable } from './components/InstancesTable';
import { StudioBreadcrumbs } from '@studio/components';
import { ArchiveReferenceSearch } from './components/ArchiveReferenceSearch';
import { StatusFilter } from './components/StatusFilter';
import { useQueryParamState } from 'admin/hooks/useQueryParamState';
import { ProcessTaskFilter } from './components/ProcessTaskFilter';

export const Instances = () => {
  const { org, env, app } = useParams() as { org: string; env: string; app: string };
  const [archiveReference, setArchiveReference] = useQueryParamState<string>(
    'archiveReference',
    undefined,
  );
  const [currentTask, setCurrentTask] = useQueryParamState<string>('currentTask', undefined);
  const [isComplete, setIsComplete] = useQueryParamState<boolean>('isComplete', undefined);
  const [isConfirmed, setIsConfirmed] = useQueryParamState<boolean>('isConfirmed', undefined);

  return (
    <div>
      <StudioBreadcrumbs>
        <StudioBreadcrumbs.Link>{app}</StudioBreadcrumbs.Link>
        <StudioBreadcrumbs.List>
          <StudioBreadcrumbs.Item>
            <StudioBreadcrumbs.Link asChild>
              <Link to={`/${org}/apps`}>Publiserte apper</Link>
            </StudioBreadcrumbs.Link>
          </StudioBreadcrumbs.Item>
          <StudioBreadcrumbs.Item>
            <StudioBreadcrumbs.Link asChild>
              <Link to={`/${org}/apps/${env}/${app}`}>{app}</Link>
            </StudioBreadcrumbs.Link>
          </StudioBreadcrumbs.Item>
          <StudioBreadcrumbs.Item>
            <StudioBreadcrumbs.Link asChild>
              <Link to=''>Instanser</Link>
            </StudioBreadcrumbs.Link>
          </StudioBreadcrumbs.Item>
        </StudioBreadcrumbs.List>
      </StudioBreadcrumbs>
      <h1>
        {env} / {app} / Instanser
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
          label='Levert av bruker'
          value={isComplete}
          setValue={setIsComplete}
          options={[
            { label: 'Alle', value: undefined },
            { label: 'Ja', value: true },
            { label: 'Nei', value: false },
          ]}
        />
        <StatusFilter
          label='Bekreftet mottatt'
          value={isConfirmed}
          setValue={setIsConfirmed}
          options={[
            { label: 'Alle', value: undefined },
            { label: 'Ja', value: true },
            { label: 'Nei', value: false },
          ]}
        />
      </div>
      <InstancesTable
        org={org}
        env={env}
        app={app}
        currentTask={currentTask}
        processIsComplete={isComplete}
        archiveReference={archiveReference}
        confirmed={isConfirmed}
      />
    </div>
  );
};
