import classes from './PageLayout.module.css';
import { matchPath, Outlet, useLocation } from 'react-router-dom';
import {
  StudioAlert,
  StudioCenter,
  StudioHeading,
  StudioPageError,
  StudioPageSpinner,
} from '@studio/components';
import { NotFound } from '../../../pages/NotFound/NotFound';
import { useTranslation } from 'react-i18next';
import { useUserOrgPermissionsQuery } from 'app-shared/hooks/queries/useUserOrgPermissionsQuery';
import { useOrganizationsQuery } from '../../../hooks/useOrganizationsQuery';
import { Menu } from '../components/Menu/Menu';

export const PageLayout = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const match = matchPath({ path: 'orgs/:org', caseSensitive: true, end: false }, pathname);
  const { org } = match?.params ?? {};
  const { data: orgs, isPending: isOrgsPending, isError: isOrgsError } = useOrganizationsQuery();
  const {
    data: orgPermissions,
    isPending: isOrgPermissionsPending,
    isError: isOrgPermissionsError,
  } = useUserOrgPermissionsQuery(org ?? '');

  if (isOrgsPending || isOrgPermissionsPending) {
    return (
      <StudioCenter>
        <StudioPageSpinner spinnerTitle={t('repo_status.loading')} />
      </StudioCenter>
    );
  }

  if (isOrgsError || isOrgPermissionsError) {
    return <StudioPageError />;
  }

  const selectedOrg = orgs?.find((o) => o.username === org);

  if (!selectedOrg) {
    return <NotFound />;
  }

  if (!orgPermissions?.isOrgOwner) {
    return (
      <StudioAlert data-color='info' className={classes.notOrgOwnerAlert}>
        {t('settings.orgs.not_org_owner_alert', {
          orgName: selectedOrg.full_name || selectedOrg.username,
        })}
      </StudioAlert>
    );
  }

  return (
    <>
      <StudioHeading level={2} className={classes.settingsHeading}>
        {t('settings.orgs.heading')}
      </StudioHeading>
      <div className={classes.settingsHeadingDescription}>
        {t('settings.orgs.heading.description')}
      </div>
      <div className={classes.pageContentWrapper}>
        <div className={classes.leftNavWrapper}>
          <Menu />
        </div>
        <div className={classes.contentWrapper}>
          <Outlet />
        </div>
      </div>
    </>
  );
};
