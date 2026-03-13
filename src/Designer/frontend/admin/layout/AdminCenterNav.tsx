import React from 'react';
import type { ReactElement } from 'react';
import { NavLink } from 'react-router-dom';
import { StudioPageHeader } from '@studio/components';
import { useTranslation } from 'react-i18next';
import classes from './PageHeader.module.css';

type AdminCenterNavProps = {
  org: string;
};

export function AdminCenterNav({ org }: AdminCenterNavProps): ReactElement {
  const { t } = useTranslation();

  return (
    <>
      <StudioPageHeader.HeaderLink
        color='dark'
        variant='regular'
        renderLink={(props) => (
          <a href={`/dashboard/app-dashboard/${org}`} {...props}>
            <span>{t('dashboard.header_item_dashboard')}</span>
          </a>
        )}
      />
      <StudioPageHeader.HeaderLink
        color='dark'
        variant='regular'
        renderLink={(props) => (
          <NavLink to={`/${org}/apps`} {...props}>
            <span className={classes.active}>{t('admin.apps.title')}</span>
          </NavLink>
        )}
      />
      <StudioPageHeader.HeaderLink
        color='dark'
        variant='regular'
        isBeta={true}
        renderLink={(props) => (
          <a href={`/dashboard/org-library/${org}`} {...props}>
            <span>{t('dashboard.header_item_library')}</span>
          </a>
        )}
      />
    </>
  );
}
