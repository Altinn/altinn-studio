import React from 'react';
import classes from './FilePath.module.css';
import { useRepoDiffQuery } from 'app-shared/hooks/queries/useRepoDiffQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import cn from 'classnames';
import { convertPureGitDiffToUserFriendlyDiff } from 'app-shared/components/GiteaHeader/VersionControlButtons/components/ShareChangesPopover/CommitAndPushContent/FileChangesInfoModal/FilePath/FilePathUtils';
import { StudioSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';

export interface FilePathProps {
  enableFileDiff: boolean;
  filePath: string;
}

export const FilePath = ({ enableFileDiff, filePath }: FilePathProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: repoDiff, isPending: repoDiffIsPending } = useRepoDiffQuery(org, app);

  let linesToRender: string[];

  if (enableFileDiff && !repoDiffIsPending && Object.keys(repoDiff).includes(filePath)) {
    linesToRender = convertPureGitDiffToUserFriendlyDiff(repoDiff[filePath]);
  }

  const fileName = filePath.split('/').pop() || '';
  const filePathWithoutName = filePath.slice(0, filePath.lastIndexOf('/' + fileName));

  const renderFilePath = () => {
    return (
      <div
        className={enableFileDiff ? classes.filePathWithDiffContainer : classes.filePathContainer}
        title={filePath}
      >
        <div className={classes.filePath}>{filePathWithoutName}</div>
        {'/'}
        <strong>{fileName}</strong>
      </div>
    );
  };

  if (!enableFileDiff) {
    return renderFilePath();
  }

  if (repoDiffIsPending || !Object.keys(repoDiff).includes(filePath)) {
    return <StudioSpinner spinnerTitle={t('general.loading')} />;
  }

  return (
    <details title={t('sync_header.show_changes_modal.file_diff_title', { fileName })}>
      <summary className={classes.summaryContent}>{renderFilePath()}</summary>
      <div className={classes.gitDiffViewer}>
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
    </details>
  );
};
