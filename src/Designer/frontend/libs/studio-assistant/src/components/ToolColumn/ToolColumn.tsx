import React from 'react';
import type { ReactElement } from 'react';
import classes from './ToolColumn.module.css';

export type ToolColumnProps = {
  selectedView: 'preview' | 'fileExplorer';
  previewContent?: ReactElement;
  fileBrowserContent?: ReactElement;
  tabLabels: {
    preview: string;
    fileBrowser: string;
  };
};

export function ToolColumn({
  selectedView,
  previewContent,
  fileBrowserContent,
}: ToolColumnProps): ReactElement {
  return (
    <div className={classes.container}>
      {selectedView === 'preview' && (
        <div className={classes.tabContent}>
          {previewContent || <div className={classes.placeholder}>Preview placeholder</div>}
        </div>
      )}
      {selectedView === 'fileExplorer' && (
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
