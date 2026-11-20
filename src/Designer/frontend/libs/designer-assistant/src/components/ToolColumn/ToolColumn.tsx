import type { ReactElement } from 'react';
import classes from './ToolColumn.module.css';
import { ToolColumnMode } from '../../types/ToolColumnMode';

export type ToolColumnProps = {
  mode: ToolColumnMode;
  previewContent: ReactElement;
  fileBrowserContent?: ReactElement;
};

// TODO: Implement Preview and FileExplorer views
export function ToolColumn({
  mode,
  previewContent,
  fileBrowserContent,
}: ToolColumnProps): ReactElement {
  return (
    <div className={classes.container}>
      {mode === ToolColumnMode.Preview && previewContent}
      {mode === ToolColumnMode.FileExplorer &&
        (fileBrowserContent ? (
          <div className={classes.fileExplorerContainer}>{fileBrowserContent}</div>
        ) : (
          <div className={classes.placeholder}>
            <ul className={classes.fileList}>
              <li>📁 src/</li>
              <li>&nbsp;&nbsp;📄 App.tsx</li>
              <li>&nbsp;&nbsp;📄 index.ts</li>
              <li>📁 components/</li>
              <li>&nbsp;&nbsp;📄 Header.tsx</li>
            </ul>
          </div>
        ))}
    </div>
  );
}
