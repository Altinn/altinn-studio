import { useContext } from 'react';
import { HeaderContext } from 'resourceadm/context/HeaderContext';
import { getOrgNameByUsername } from 'resourceadm/utils/userUtils';
import { useTranslation } from 'react-i18next';
import { useUrlParams } from '../useUrlParams';

export const useProfileMenuTriggerButtonText = (): string => {
  const { t } = useTranslation();
  const { user, selectableOrgs } = useContext(HeaderContext);
  const { org: selectedContext } = useUrlParams();

  // TODO NOT WORKING
  const username = (user?.full_name || user?.login) ?? '';

  return t('shared.header_user_for_org', {
    user: username,
    org: getOrgNameByUsername(selectedContext, selectableOrgs),
  });
};
