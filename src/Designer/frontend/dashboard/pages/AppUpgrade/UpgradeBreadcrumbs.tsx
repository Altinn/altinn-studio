import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { StudioBreadcrumbs } from '@studio/components';
import { useTranslation } from 'react-i18next';

type UpgradeBreadcrumbsProps = {
  dashboardPath: string;
  appName: string;
  appUrl: string;
  currentPageName: string;
};

export const UpgradeBreadcrumbs = ({
  dashboardPath,
  appName,
  appUrl,
  currentPageName,
}: UpgradeBreadcrumbsProps): ReactElement => {
  const { t } = useTranslation();
  return (
    <StudioBreadcrumbs aria-label={t('app_upgrade.breadcrumbs_label')}>
      <StudioBreadcrumbs.List>
        <StudioBreadcrumbs.Item>
          <StudioBreadcrumbs.Link asChild>
            <Link to={dashboardPath}>{t('dashboard.header_item_dashboard')}</Link>
          </StudioBreadcrumbs.Link>
        </StudioBreadcrumbs.Item>
        <StudioBreadcrumbs.Item>
          <StudioBreadcrumbs.Link href={appUrl}>{appName}</StudioBreadcrumbs.Link>
        </StudioBreadcrumbs.Item>
        <StudioBreadcrumbs.Item>
          <StudioBreadcrumbs.Link aria-current='page'>{currentPageName}</StudioBreadcrumbs.Link>
        </StudioBreadcrumbs.Item>
      </StudioBreadcrumbs.List>
    </StudioBreadcrumbs>
  );
};
