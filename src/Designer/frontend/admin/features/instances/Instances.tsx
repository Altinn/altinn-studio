import React from 'react';
import classes from './Instances.module.css';
import { Link, useParams } from 'react-router-dom';
import { InstancesTable } from './components/InstancesTable';
import { StudioBreadcrumbs } from '@studio/components';
import { ProcessTaskPicker, useProcessTaskPicker } from './components/ProcessTaskPicker';
import {
  ArchiveReferenceSearch,
  useArchiveReferenceSearch,
} from './components/ArchiveReferenceSearch';
import { StatusFilter, useStatusFilter } from './components/StatusFilter';

export const Instances = () => {
  const { org, env, app } = useParams() as { org: string; env: string; app: string };
  const [archiveReference, setArchiveReference] = useArchiveReferenceSearch();
  const processTaskPickerState = useProcessTaskPicker();
  const [isConfirmed, setIsConfirmed] = useStatusFilter<boolean>('isConfirmed');

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
        <ProcessTaskPicker org={org} env={env} app={app} state={processTaskPickerState} />
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
        currentTask={processTaskPickerState.currentTask}
        processIsComplete={processTaskPickerState.isComplete}
        archiveReference={archiveReference}
        confirmed={isConfirmed}
      />
    </div>
  );
};
