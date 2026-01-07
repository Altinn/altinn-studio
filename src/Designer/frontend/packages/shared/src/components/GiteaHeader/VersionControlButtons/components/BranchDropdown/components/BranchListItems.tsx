import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioDropdown } from '@studio/components';
import { PlusIcon } from '@studio/icons';

export interface BranchListItemsProps {
  branchList: Array<{ name: string }> | undefined;
  currentBranch: string | undefined;
  onBranchClick: (branchName: string) => void;
  onCreateBranchClick: () => void;
}

export const BranchListItems = ({
  branchList,
  currentBranch,
  onBranchClick,
  onCreateBranchClick,
}: BranchListItemsProps) => {
  const { t } = useTranslation();

  return (
    <>
      {branchList?.map((branch) => (
        <StudioDropdown.Item key={branch.name}>
          <StudioDropdown.Button
            onClick={() => onBranchClick(branch.name)}
            disabled={branch.name === currentBranch}
          >
            {branch.name}
          </StudioDropdown.Button>
        </StudioDropdown.Item>
      ))}
      <StudioDropdown.Item>
        <StudioDropdown.Button onClick={onCreateBranchClick}>
          <PlusIcon />
          {t('branching.new_branch_dialog.trigger')}
        </StudioDropdown.Button>
      </StudioDropdown.Item>
    </>
  );
};
