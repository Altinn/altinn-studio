import { SelectedContextType } from '../../enums/SelectedContextType';
import { getOrgNameByUsername } from 'dashboard/utils/userUtils';
import { useSelectedContext } from '../useSelectedContext';
import { useHeaderContext } from '../../context/HeaderContext';

export const usePageHeaderTitle = () => {
  const selectedContext = useSelectedContext();
  const { selectableOrgs } = useHeaderContext();

  if (selectedContext !== SelectedContextType.All && selectedContext !== SelectedContextType.Self) {
    return getOrgNameByUsername(selectedContext, selectableOrgs);
  }
  return '';
};
