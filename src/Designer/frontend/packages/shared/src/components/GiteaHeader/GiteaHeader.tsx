import type { ReactElement, ReactNode } from 'react';
import classes from './GiteaHeader.module.css';
import { VersionControlButtons } from './VersionControlButtons';
import { ThreeDotsMenu } from './ThreeDotsMenu';
import { GiteaHeaderContext } from './context/GiteaHeaderContext';

type GiteaHeaderProps = {
  menuOnlyHasRepository?: boolean;
  hasCloneModal?: boolean;
  rightContentClassName?: string;
  leftComponent?: ReactNode;
  rightContent?: ReactNode;
  hasRepoError?: boolean;
  onPullSuccess?: () => void;
  /**
   * Runs when the user opens "share changes", before the changed files are listed, so files it changes
   * are listed and shared too. It should handle its own errors; sharing goes on if it fails.
   */
  onBeforeShare?: () => Promise<void>;
  owner: string;
  repoName: string;
};

export const GiteaHeader = ({
  menuOnlyHasRepository = false,
  hasCloneModal = false,
  rightContentClassName,
  rightContent,
  leftComponent,
  hasRepoError,
  onPullSuccess,
  onBeforeShare,
  owner,
  repoName,
}: GiteaHeaderProps): ReactElement => {
  return (
    <GiteaHeaderContext.Provider value={{ owner, repoName }}>
      <div className={classes.wrapper}>
        <div className={classes.leftContentWrapper}>{leftComponent}</div>
        <div className={`${classes.rightContentWrapper} ${rightContentClassName}`}>
          {rightContent}
          {!hasRepoError && (
            <VersionControlButtons onPullSuccess={onPullSuccess} onBeforeShare={onBeforeShare} />
          )}
          <ThreeDotsMenu isClonePossible={!menuOnlyHasRepository && hasCloneModal} />
        </div>
      </div>
    </GiteaHeaderContext.Provider>
  );
};
