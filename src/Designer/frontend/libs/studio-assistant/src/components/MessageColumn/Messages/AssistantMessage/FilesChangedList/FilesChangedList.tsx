import type { ReactElement } from 'react';
import { StudioTag } from '@studio/components';
import classes from './FilesChangedList.module.css';

export type FilesChangedListProps = {
  filePaths: string[];
};

export function FilesChangedList({ filePaths }: FilesChangedListProps): ReactElement {
  return (
    <div className={classes.filesSection}>
      <span className={classes.filesSectionTitle}>Files Modified</span>
      <div className={classes.fileCards}>
        {filePaths.map((filePath) => {
          const parts = filePath.split('/');
          const fileName = parts.pop() ?? filePath;
          const directory = parts.join('/');

          return (
            <button
              key={filePath}
              type='button'
              className={classes.fileCard}
              title={filePath}
              data-file-path={filePath}
            >
              <StudioTag data-color='accent'>{fileName}</StudioTag>
              {directory && <span className={classes.fileCardDirectory}>{directory}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
