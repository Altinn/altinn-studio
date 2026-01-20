import { Link, useParams } from 'react-router-dom';
import { StudioBreadcrumbs, StudioHeading } from '@studio/components';
import { AppMetrics } from './components/AppMetrics';
import { useTranslation } from 'react-i18next';
import { useQueryParamState } from 'admin/hooks/useQueryParamState';
import classes from './AppDetails.module.css';
import { Instances } from '../instances/Instances';

export const AppsDetails = () => {
  const { t } = useTranslation();
  const { org, env, app } = useParams() as { org: string; env: string; app: string };
  const defaultRange = 1440;
  const [range, setRange] = useQueryParamState<number>('range', defaultRange);

  return (
    <div className={classes.container}>
      <StudioBreadcrumbs>
        <StudioBreadcrumbs.Link>{app}</StudioBreadcrumbs.Link>
        <StudioBreadcrumbs.List>
          <StudioBreadcrumbs.Item>
            <StudioBreadcrumbs.Link asChild>
              <Link
                to={`/${org}/apps?environment="${env}"${range && range !== defaultRange ? '&range=' + range : ''}`}
              >
                {t('admin.apps.title')}
              </Link>
            </StudioBreadcrumbs.Link>
          </StudioBreadcrumbs.Item>
          <StudioBreadcrumbs.Item>
            <StudioBreadcrumbs.Link asChild>
              <Link to={`${range && range !== defaultRange ? '?range=' + range : ''}`}>{app}</Link>
            </StudioBreadcrumbs.Link>
          </StudioBreadcrumbs.Item>
        </StudioBreadcrumbs.List>
      </StudioBreadcrumbs>
      <StudioHeading className={classes.heading} data-size='lg'>
        {env} / {app}
      </StudioHeading>
      <div className={classes.metrics}>
        <AppMetrics range={range ?? defaultRange} setRange={setRange} />
      </div>
      <div>
        <Instances />
      </div>
    </div>
  );
};
