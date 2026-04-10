import classes from './PageLayout.module.css';
import { matchPath, useLocation } from 'react-router-dom';
import {
  StudioCenter,
  StudioHeading,
  StudioPageError,
  StudioPageSpinner,
} from '@studio/components';
import { NotFound } from '../../../pages/NotFound/NotFound';
import { useTranslation } from 'react-i18next';
import { useUserOrgPermissionsQuery } from 'app-shared/hooks/queries/useUserOrgPermissionsQuery';
import { useOrganizationsQuery } from '../../../hooks/useOrganizationsQuery';
import { PageContent } from './PageContent';

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

  return (
    <>
      <StudioHeading level={2} className={classes.settingsHeading}>
        {t('settings.orgs.heading')}
      </StudioHeading>
      <div className={classes.settingsHeadingDescription}>
        {t('settings.orgs.heading.description')}
      </div>
      <PageContent selectedOrg={selectedOrg} isOrgOwner={orgPermissions?.isOrgOwner ?? false} />
    </>
  );
};
