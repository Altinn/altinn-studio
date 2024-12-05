import { useContext } from 'react';
import { HeaderContext, SelectedContextType } from 'dashboard/context/HeaderContext';
import { getOrgNameByUsername } from 'dashboard/utils/userUtils';
import { useSelectedContext } from '../useSelectedContext';

export const usePageHeaderTitle = () => {
  const selectedContext = useSelectedContext();
  const { selectableOrgs } = useContext(HeaderContext);

  if (selectedContext !== SelectedContextType.All && selectedContext !== SelectedContextType.Self) {
    return getOrgNameByUsername(selectedContext, selectableOrgs);
  }
  return '';
};
