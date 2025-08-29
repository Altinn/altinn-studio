import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import classes from './GiteaHeader.module.css';
import { VersionControlButtons } from './VersionControlButtons';
import { ThreeDotsMenu } from './ThreeDotsMenu';
import { GiteaHeaderContext } from './context/GiteaHeaderContext';

type GiteaHeaderProps = {
  menuOnlyHasRepository?: boolean;
  hasCloneModal?: boolean;
  rightContentClassName?: string;
  leftComponent?: ReactNode;
  hasRepoError?: boolean;
  onPullSuccess?: () => void;
  owner: string;
  repoName: string;
};

export const GiteaHeader = ({
  menuOnlyHasRepository = false,
  hasCloneModal = false,
  rightContentClassName,
  leftComponent,
  hasRepoError,
  onPullSuccess,
  owner,
  repoName,
}: GiteaHeaderProps): ReactElement => {
  return (
    <GiteaHeaderContext.Provider value={{ owner, repoName }}>
      <div className={classes.wrapper}>
        <div className={classes.leftContentWrapper}>{leftComponent}</div>
        <div className={`${classes.rightContentWrapper} ${rightContentClassName}`}>
          {!hasRepoError && <VersionControlButtons onPullSuccess={onPullSuccess} />}
          <ThreeDotsMenu isClonePossible={!menuOnlyHasRepository && hasCloneModal} />
        </div>
      </div>
    </GiteaHeaderContext.Provider>
  );
};
