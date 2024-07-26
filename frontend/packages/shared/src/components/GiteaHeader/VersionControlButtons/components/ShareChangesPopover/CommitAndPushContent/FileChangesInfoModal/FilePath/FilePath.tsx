import React, { useState } from 'react';
import classes from './FilePath.module.css';
import { useRepoDiffQuery } from 'app-shared/hooks/queries/useRepoDiffQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import cn from 'classnames';
import { convertPureGitDiffToUserFriendlyDiff } from 'app-shared/components/GiteaHeader/VersionControlButtons/components/ShareChangesPopover/CommitAndPushContent/FileChangesInfoModal/FilePath/FilePathUtils';

export interface FilePathProps {
  enableFileDiff: boolean;
  filePath: string;
}

export const FilePath = ({ enableFileDiff, filePath }: FilePathProps) => {
  const [showDiff, setShowDiff] = useState<boolean>(false);
  const { org, app } = useStudioEnvironmentParams();
  const { data: repoDiff, isPending: repoDiffIsPending } = useRepoDiffQuery(org, app);

  let linesToRender: string[];

  if (enableFileDiff && !repoDiffIsPending && Object.keys(repoDiff).includes(filePath)) {
    linesToRender = convertPureGitDiffToUserFriendlyDiff(repoDiff[filePath]);
  }

  const fileName = filePath.split('/').pop() || '';
  const filePathWithoutName = filePath.slice(0, filePath.lastIndexOf('/' + fileName));

  return (
    <>
      <div
        className={enableFileDiff ? classes.filePathWithDiffContainer : classes.filePathContainer}
        title={filePath}
        onClick={enableFileDiff ? () => setShowDiff(!showDiff) : () => {}}
      >
        <div className={classes.filePath}>{filePathWithoutName}</div>
        {'/'}
        <strong>{fileName}</strong>
      </div>
      {enableFileDiff && showDiff && !repoDiffIsPending && (
        <div className={classes.gitDiffViewer} onClick={() => setShowDiff(false)}>
          {linesToRender.map((line, index) => {
            return (
              <div
                key={index}
                className={cn(
                  line.startsWith('-') && classes.removedLine,
                  line.startsWith('+') && classes.addedLine,
                )}
              >
                {line}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};
