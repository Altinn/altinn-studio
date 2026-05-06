import classes from './PageLayout.module.css';
import { Outlet } from 'react-router-dom';
import { StudioAlert, StudioCenter, StudioHeading, StudioPageSpinner } from '@studio/components';
import { StudioPageError } from 'app-shared/components';
import { NotFound } from '../../../components/NotFound/NotFound';
import { useTranslation } from 'react-i18next';
import { useOrganizationsQuery, useUserOrgPermissionsQuery } from 'app-shared/hooks/queries';
import { Menu } from '../components/Menu/Menu';
import { useRequiredRoutePathsParams } from 'settings/hooks/useRequiredRoutePathsParams';

export const PageLayout = () => {
  const { t } = useTranslation();
  const { owner: org } = useRequiredRoutePathsParams(['owner']);
  const { data: orgs, isPending: isOrgsPending, isError: isOrgsError } = useOrganizationsQuery();
  const selectedOrg = orgs?.find((o) => o.username === org);
  const {
    data: orgPermissions,
    isPending: isOrgPermissionsPending,
    isError: isOrgPermissionsError,
  } = useUserOrgPermissionsQuery(org, { enabled: !!selectedOrg });

  if (isOrgsPending || (isOrgPermissionsPending && !!selectedOrg)) {
    return (
      <StudioCenter>
        <StudioPageSpinner spinnerTitle={t('general.loading')} />
      </StudioCenter>
    );
  }

  if (isOrgsError || isOrgPermissionsError) {
    return <StudioPageError />;
  }

  if (!selectedOrg) {
    return <NotFound />;
  }

  if (!orgPermissions?.isOrgOwner) {
    return (
      <StudioCenter>
        <StudioAlert data-color='info'>
          {t('settings.orgs.not_org_owner_alert', {
            orgName: selectedOrg.full_name || selectedOrg.username,
          })}
        </StudioAlert>
      </StudioCenter>
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
