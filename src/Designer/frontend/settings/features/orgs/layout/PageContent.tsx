import classes from './PageContent.module.css';
import { Outlet } from 'react-router-dom';
import { Menu } from '../components/Menu/Menu';
import { StudioAlert } from '@studio/components';
import { useTranslation } from 'react-i18next';
import type { Organization } from 'app-shared/types/Organization';

type PageContentProps = {
  selectedOrg: Organization;
  isOrgOwner: boolean;
};

export const PageContent = ({ selectedOrg, isOrgOwner }: PageContentProps) => {
  const { t } = useTranslation();

  if (!isOrgOwner) {
    return (
      <StudioAlert data-color='info' className={classes.notOrgOwnerAlert}>
        {t('settings.orgs.not_org_owner_alert', {
          orgName: selectedOrg.full_name || selectedOrg.username,
        })}
      </StudioAlert>
    );
  }

  return (
    <div className={classes.pageContentWrapper}>
      <div className={classes.leftNavWrapper}>
        <Menu />
      </div>
      <div className={classes.contentWrapper}>
        <Outlet />
      </div>
    </div>
  );
};
