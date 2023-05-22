import React from 'react';

import { Tabs } from '@digdir/design-system-react';

import { DevNavigationButtons } from 'src/features/devtools/components/DevNavigationButtons/DevNavigationButtons';
import { ExpressionPlayground } from 'src/features/devtools/components/ExpressionPlayground/ExpressionPlayground';
import { LayoutInspector } from 'src/features/devtools/components/LayoutInspector/LayoutInspector';
import { PDFPreviewButton } from 'src/features/devtools/components/PDFPreviewButton/PDFPreviewButton';
import { PermissionsEditor } from 'src/features/devtools/components/PermissionsEditor/PermissionsEditor';
import { VersionSwitcher } from 'src/features/devtools/components/VersionSwitcher/VersionSwitcher';
import classes from 'src/features/devtools/DevTools.module.css';

export const DevToolsControls = () => (
  <div className={classes.tabs}>
    <Tabs
      items={[
        {
          name: 'Generelt',
          content: (
            <div className={classes.page}>
              <PDFPreviewButton />
              <DevNavigationButtons />
              <VersionSwitcher />
              <PermissionsEditor />
            </div>
          ),
        },
        {
          name: 'Komponenter',
          content: <LayoutInspector />,
        },
        {
          name: 'Test uttrykk',
          content: <ExpressionPlayground />,
        },
      ]}
    />
  </div>
);
