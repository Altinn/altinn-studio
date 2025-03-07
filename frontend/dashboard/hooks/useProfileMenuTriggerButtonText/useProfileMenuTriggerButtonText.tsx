import { useContext } from 'react';
import { HeaderContext } from 'dashboard/context/HeaderContext';
import { SelectedContextType } from '../../enums/SelectedContextType';
import { getOrgNameByUsername } from 'dashboard/utils/userUtils';
import { useTranslation } from 'react-i18next';
import { useSelectedContext } from '../useSelectedContext';

export const useProfileMenuTriggerButtonText = (): string => {
  const { t } = useTranslation();
  const { user, selectableOrgs } = useContext(HeaderContext);
  const selectedContext = useSelectedContext();

  const username = user.full_name || user.login;

  if (selectedContext !== SelectedContextType.All && selectedContext !== SelectedContextType.Self) {
    return t('shared.header_user_for_org', {
      user: username,
      org: getOrgNameByUsername(selectedContext, selectableOrgs),
    });
  }
  return username;
};
