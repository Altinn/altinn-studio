import { useHeaderContext } from '../../context/HeaderContext';
import { SelectedContextType } from '../../enums/SelectedContextType';
import { getOrgNameByUsername } from '../../utils/userUtils';
import { useTranslation } from 'react-i18next';
import { useSelectedContext } from '../useSelectedContext';

export const useProfileMenuTriggerButtonText = (): string => {
  const { t } = useTranslation();
  const { user, selectableOrgs } = useHeaderContext();
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
