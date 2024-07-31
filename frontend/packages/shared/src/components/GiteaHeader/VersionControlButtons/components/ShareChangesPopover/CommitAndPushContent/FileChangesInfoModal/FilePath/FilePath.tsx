import React from 'react';
import classes from './FilePath.module.css';
import cn from 'classnames';
import { convertPureGitDiffToUserFriendlyDiff } from './FilePathUtils';
import { useTranslation } from 'react-i18next';
import { extractFilename, removeFileNameFromPath } from 'app-shared/utils/filenameUtils';

export interface FilePathProps {
  enableFileDiff: boolean;
  filePath: string;
  diff?: string; // Might be null for deleted files
  repoDiffStatus: 'success' | 'error' | 'pending';
}

export const FilePath = ({ enableFileDiff, filePath, diff, repoDiffStatus }: FilePathProps) => {
  const { t } = useTranslation();

  let linesToRender: string[];

  if (enableFileDiff && !!diff) {
    linesToRender = convertPureGitDiffToUserFriendlyDiff(diff);
  }

  const fileName = extractFilename(filePath);
  const filePathWithoutName = removeFileNameFromPath(filePath, true);

  const renderFilePath = (asButton: boolean) => {
    return (
      <div
        className={asButton ? classes.filePathWithDiffContainer : classes.filePathContainer}
        title={filePath}
      >
        <div className={classes.filePath}>{filePathWithoutName}</div>
        {'/'}
        <strong>{fileName}</strong>
      </div>
    );
  };

  if (!enableFileDiff || repoDiffStatus !== 'success') {
    return renderFilePath(false);
  }
  return (
    <details
      className={classes.details}
      title={t('sync_header.show_changes_modal.file_diff_title', { fileName })}
    >
      <summary className={classes.summaryContent}>{renderFilePath(true)}</summary>
      <div className={classes.gitDiffViewer}>
        {linesToRender.map((line, index) => {
          return (
            <div
              key={index}
              className={cn(
                classes.diffLine,
                line.startsWith('-') && classes.removedLine,
                line.startsWith('+') && classes.addedLine,
              )}
            >
              {line}
            </div>
          );
        })}
      </div>
    </details>
  );
};
