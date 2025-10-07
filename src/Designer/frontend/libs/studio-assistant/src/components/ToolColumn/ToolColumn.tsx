import React from 'react';
import type { ReactElement } from 'react';
import classes from './ToolColumn.module.css';
import { ViewType } from '../../types/ViewType';

export type ToolColumnProps = {
  selectedView: ViewType;
  previewContent?: ReactElement;
  fileBrowserContent?: ReactElement;
};

export function ToolColumn({
  selectedView,
  previewContent,
  fileBrowserContent,
}: ToolColumnProps): ReactElement {
  return (
    <div className={classes.container}>
      {selectedView === ViewType.Preview && (
        <div className={classes.tabContent}>
          {previewContent || <div className={classes.placeholder}>Preview placeholder</div>}
        </div>
      )}
      {selectedView === ViewType.FileExplorer && (
        <div className={classes.tabContent}>
          {fileBrowserContent || (
            <div className={classes.placeholder}>
              <ul className={classes.fileList}>
                <li>📁 src/</li>
                <li>&nbsp;&nbsp;📄 App.tsx</li>
                <li>&nbsp;&nbsp;📄 index.ts</li>
                <li>📁 components/</li>
                <li>&nbsp;&nbsp;📄 Header.tsx</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
