import React from 'react';
import { StudioBreadcrumbs } from '@studio/components';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createSearchParams } from 'admin/utils/constants';

type RouteInfo =
  | {
      route: 'apps';
      environment?: string;
      range?: number;
    }
  | {
      route: 'app';
      environment: string;
      app: string;
      range?: number;
    }
  | {
      route: 'instance';
      environment: string;
      app: string;
      instanceId: string;
    };

const Breadcrumb = ({ org, route }: { org: string; route: RouteInfo }) => {
  const { t } = useTranslation();

  switch (route.route) {
    case 'apps': {
      const { environment, range } = route;
      const searchParams = createSearchParams({ environment, range });
      return (
        <StudioBreadcrumbs.Item>
          <StudioBreadcrumbs.Link asChild>
            <Link to={`/${org}/apps${searchParams}`}>
              {environment ? t('admin.apps.title_env', { environment }) : t('admin.apps.title')}
            </Link>
          </StudioBreadcrumbs.Link>
        </StudioBreadcrumbs.Item>
      );
    }
    case 'app': {
      const { environment, app, range } = route;
      const searchParams = createSearchParams({ range });
      return (
        <StudioBreadcrumbs.Item>
          <StudioBreadcrumbs.Link asChild>
            <Link to={`/${org}/apps/${environment}/${app}${searchParams}`}>{app}</Link>
          </StudioBreadcrumbs.Link>
        </StudioBreadcrumbs.Item>
      );
    }
    case 'instance': {
      const { environment, app, instanceId } = route;
      return (
        <StudioBreadcrumbs.Item>
          <StudioBreadcrumbs.Link asChild>
            <Link to={`/${org}/apps/${environment}/${app}/instances/${instanceId}`}>
              {instanceId}
            </Link>
          </StudioBreadcrumbs.Link>
        </StudioBreadcrumbs.Item>
      );
    }
  }
};

export const Breadcrumbs = ({ org, routes }: { org: string; routes: RouteInfo[] }) => {
  if (!routes.length) {
    return null;
  }

  return (
    <StudioBreadcrumbs>
      <StudioBreadcrumbs.List>
        {routes.map((route) => (
          <Breadcrumb key={JSON.stringify(route)} org={org} route={route} />
        ))}
      </StudioBreadcrumbs.List>
    </StudioBreadcrumbs>
  );
};
