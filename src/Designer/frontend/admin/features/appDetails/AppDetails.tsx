import { useParams } from 'react-router-dom';
import { StudioHeading } from '@studio/components';
import { AppMetrics } from './components/AppMetrics';
import { useQueryParamState } from 'admin/hooks/useQueryParamState';
import classes from './AppDetails.module.css';
import { Instances } from '../instances/Instances';
import { AppInfo } from './components/AppInfo';
import { Breadcrumbs } from 'admin/components/Breadcrumbs/Breadcrumbs';
import { DEFAULT_SEARCH_PARAMS } from 'admin/utils/constants';

export const AppsDetails = () => {
  const { org, environment, app } = useParams() as {
    org: string;
    environment: string;
    app: string;
  };
  const defaultRange = DEFAULT_SEARCH_PARAMS.range;
  const [range, setRange] = useQueryParamState<number>('range', defaultRange);

  return (
    <div className={classes.container}>
      <Breadcrumbs
        org={org}
        routes={[
          { route: 'apps', environment, range },
          { route: 'app', environment, app, range },
        ]}
      />
      <StudioHeading data-size='lg'>{app}</StudioHeading>
      <AppInfo org={org} environment={environment} app={app} />
      <div className={classes.metrics}>
        <AppMetrics range={range ?? defaultRange} setRange={setRange} />
      </div>
      <div>
        <Instances />
      </div>
    </div>
  );
};
