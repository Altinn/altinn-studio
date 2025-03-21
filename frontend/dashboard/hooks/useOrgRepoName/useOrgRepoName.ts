import { ORG_LIBRARY_REPO_IDENTIFIER } from '../../constants';
import { SelectedContextType } from '../../enums/SelectedContextType';
import { useSelectedContext } from '../useSelectedContext';

export function useOrgRepoName(): string | null {
  const selectedContext = useSelectedContext();

  if (selectedContext !== SelectedContextType.All && selectedContext !== SelectedContextType.Self) {
    return `${selectedContext}${ORG_LIBRARY_REPO_IDENTIFIER}`;
  }
  return null;
}
