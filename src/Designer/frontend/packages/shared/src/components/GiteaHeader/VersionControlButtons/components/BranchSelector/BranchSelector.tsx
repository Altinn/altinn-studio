import React, { useState, useEffect } from 'react';
import { StudioDropdown } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useRepoBranchesQuery } from 'app-shared/hooks/queries/useRepoBranchesQuery';
import { useRepoCurrentBranchQuery } from 'app-shared/hooks/queries/useRepoCurrentBranchQuery';
import { useSetRepoBranchMutation } from 'app-shared/hooks/mutations/useSetRepoBranchMutation';
import { useGiteaHeaderContext } from '../../../context/GiteaHeaderContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { BranchingIcon } from '@studio/icons';
import classes from './BranchSelector.module.css';

export const BranchSelector = () => {
  const { t } = useTranslation();
  const { owner, repoName } = useGiteaHeaderContext();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { data: branches, isLoading } = useRepoBranchesQuery(owner, repoName);
  const { data: currentBranch } = useRepoCurrentBranchQuery(owner, repoName);
  const setBranchMutation = useSetRepoBranchMutation(owner, repoName);
  const [selectedBranch, setSelectedBranch] = useState<string>('main');

  useEffect(() => {
    if (currentBranch) {
      setSelectedBranch(currentBranch);
    }
  }, [currentBranch]);

  const handleBranchSelect = async (branchName: string) => {
    try {
      console.log('Starting branch switch to:', branchName);
      await setBranchMutation.mutateAsync(branchName);
      setSelectedBranch(branchName);
      console.log('Successfully switched to branch:', branchName);

      // Invalidate queries related to this repository to refresh data for the new branch
      console.log('Invalidating repository-related queries...');
      await queryClient.invalidateQueries({
        predicate: (query) => {
          return query.queryKey.some(
            (key) => typeof key === 'string' && (key.includes(owner) || key.includes(repoName)),
          );
        },
      });

      // specifically invalidate the current branch query since it should now return the new branch
      await queryClient.invalidateQueries({
        queryKey: [QueryKey.RepoCurrentBranch, owner, repoName],
      });

      console.log('Repository queries invalidated');

      // Check if we're on the AI assistant route
      const isAiAssistantRoute = location.pathname.includes('/ai-assistant');
      console.log(
        'Current route:',
        location.pathname,
        'Is AI assistant route:',
        isAiAssistantRoute,
      );
      if (isAiAssistantRoute) {
        // For AI assistant route, trigger preview reload like the AI assistant does
        console.log('Dispatching altinity-repo-reset event for AI assistant');
        window.dispatchEvent(
          new CustomEvent('altinity-repo-reset', {
            detail: { branch: branchName, sessionId: 'branch-switch' },
          }),
        );
      }

      // Dispatch general branch-switched event for other components
      console.log('Dispatching branch-switched event');
      window.dispatchEvent(
        new CustomEvent('branch-switched', {
          detail: { branch: branchName, owner, repoName },
        }),
      );

      console.log('Branch switch process completed');
    } catch (error) {
      console.error('Failed to switch branch:', error);
    }
  };

  if (isLoading || !branches || !Array.isArray(branches)) {
    return null;
  }

  return (
    <StudioDropdown
      triggerButtonText={selectedBranch}
      icon={<BranchingIcon style={{ color: 'white' }} />}
      triggerButtonVariant='tertiary'
      triggerButtonClassName={classes.branchSelector}
    >
      <StudioDropdown.List>
        <StudioDropdown.Heading>
          {t('version_control.branch_selector.heading')}
        </StudioDropdown.Heading>
        {branches.map((branch) => (
          <StudioDropdown.Item key={branch.name}>
            <StudioDropdown.Button
              onClick={() => handleBranchSelect(branch.name)}
              className={selectedBranch === branch.name ? classes.selectedBranch : ''}
            >
              {branch.name}
            </StudioDropdown.Button>
          </StudioDropdown.Item>
        ))}
      </StudioDropdown.List>
    </StudioDropdown>
  );
};
