import React, { useState } from 'react';
import classes from './FilePath.module.css';
import { useRepoDiffQuery } from 'app-shared/hooks/queries/useRepoDiffQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import cn from 'classnames';

export interface FilePathProps {
  enableFileDiff: boolean;
  filePath: string;
}

export const FilePath = ({ enableFileDiff, filePath }: FilePathProps) => {
  const [showDiff, setShowDiff] = useState<boolean>(false);
  const { org, app } = useStudioEnvironmentParams();
  const { data: repoDiff, isPending: repoDiffIsPending } = useRepoDiffQuery(org, app);

  debugger;

  let linesToRender: string[];

  if (enableFileDiff && !repoDiffIsPending && Object.keys(repoDiff).includes(filePath)) {
    const lines = repoDiff[filePath].split('\n');
    // Following code cleans up diff response that will be interpreted as noise for most end users
    let showLine = false;
    linesToRender = lines.filter((line) => {
      if (showLine) return line;
      if (line.startsWith('@@')) showLine = true;
    });
    if (linesToRender[linesToRender.length - 1].includes('No newline at end of file'))
      linesToRender.splice(linesToRender.length - 1);
    // End of cleanup
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
