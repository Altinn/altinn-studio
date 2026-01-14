import { useBranchesQuery } from 'app-shared/hooks/queries/useBranchesQuery';
import { useCurrentBranchQuery } from 'app-shared/hooks/queries/useCurrentBranchQuery';
import type { Branch } from 'app-shared/types/api/BranchTypes';

export interface UseBranchDataResult {
  currentBranch: string | undefined;
  branchList: Array<Branch> | undefined;
  isLoading: boolean;
}

export function useBranchData(org: string, app: string): UseBranchDataResult {
  const { data: currentBranchInfo, isLoading: isLoadingCurrentBranch } = useCurrentBranchQuery(
    org,
    app,
  );
  const { data: branchList, isLoading: isLoadingBranchList } = useBranchesQuery(org, app);

  return {
    currentBranch: currentBranchInfo?.branchName,
    branchList,
    isLoading: isLoadingCurrentBranch || isLoadingBranchList,
  };
}
