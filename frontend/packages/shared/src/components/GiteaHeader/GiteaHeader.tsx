import type { ReactNode } from 'react';
import React from 'react';
import classes from './GiteaHeader.module.css';
import { VersionControlButtons } from './VersionControlButtons';
import { ThreeDotsMenu } from './ThreeDotsMenu';

type GiteaHeaderProps = {
  menuOnlyHasRepository?: boolean;
  hasCloneModal?: boolean;
  rightContentClassName?: string;
  leftComponent?: ReactNode;
  hasRepoError?: boolean;
  onPullSuccess?: () => void;
};

/**
 * @component
 * @example
 *    <GiteaHeader
 *        menuOnlyHasRepository
 *        extraPadding
 *        rightContentClassName={classes.someExtraStyle}
 *    />
 *
 * @property {boolean}[menuOnlyHasRepository] - Flag for if the three dots menu only should show the repository option. This is relevant for resourceadm
 * @property {boolean}[hasCloneModal] - Flag for if the component has a clone modal. This is relevant for app-development
 * @property {string}[rightContentClassName] - Classname for some extra styling for the right content
 * @property {ReactNode}[leftComponent] - Component to be shown on the left
 * @property {boolean}[hasRepoError] - If the repository has an error
 *
 * @returns {React.ReactNode} - The rendered Gitea header component
 */
export const GiteaHeader = ({
  menuOnlyHasRepository = false,
  hasCloneModal = false,
  rightContentClassName,
  leftComponent,
  hasRepoError,
  onPullSuccess,
}: GiteaHeaderProps): React.ReactNode => {
  return (
    <div className={classes.wrapper}>
      <div className={classes.leftContentWrapper}>{leftComponent}</div>
      <div className={`${classes.rightContentWrapper} ${rightContentClassName}`}>
        {!hasRepoError && <VersionControlButtons onPullSuccess={onPullSuccess} />}
        <ThreeDotsMenu onlyShowRepository={menuOnlyHasRepository} hasCloneModal={hasCloneModal} />
      </div>
    </div>
  );
};
