import React from 'react';
import type { ReactElement } from 'react';
import { Tabs } from '@digdir/designsystemet-react';
import classes from './ChatSidePanel.module.css';

export type ChatSidePanelProps = {
  previewContent?: ReactElement;
  diffContent?: ReactElement;
  fileBrowserContent?: ReactElement;
  tabLabels: {
    preview: string;
    diff: string;
    fileBrowser: string;
  };
};

export function ChatSidePanel({
  previewContent,
  diffContent,
  fileBrowserContent,
  tabLabels,
}: ChatSidePanelProps): ReactElement {
  return (
    <div className={classes.container}>
      <Tabs defaultValue='preview' size='sm'>
        <Tabs.List>
          <Tabs.Tab value='preview'>{tabLabels.preview}</Tabs.Tab>
          <Tabs.Tab value='diff'>{tabLabels.diff}</Tabs.Tab>
          <Tabs.Tab value='fileBrowser'>{tabLabels.fileBrowser}</Tabs.Tab>
        </Tabs.List>
        <Tabs.Content value='preview' className={classes.tabContent}>
          {previewContent || <div className={classes.placeholder}>Preview placeholder</div>}
        </Tabs.Content>
        <Tabs.Content value='diff' className={classes.tabContent}>
          {diffContent || (
            <div className={classes.placeholder}>
              <pre className={classes.diffExample}>
                {`- Old line
+ New line
  Unchanged line`}
              </pre>
            </div>
          )}
        </Tabs.Content>
        <Tabs.Content value='fileBrowser' className={classes.tabContent}>
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
        </Tabs.Content>
      </Tabs>
    </div>
  );
}
