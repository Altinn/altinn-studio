import React from 'react';

import { Tabs } from '@digdir/design-system-react';

import { DevHiddenFunctionality } from 'src/features/devtools/components/DevHiddenFunctionality/DevHiddenFunctionality';
import { DevNavigationButtons } from 'src/features/devtools/components/DevNavigationButtons/DevNavigationButtons';
import { ExpressionPlayground } from 'src/features/devtools/components/ExpressionPlayground/ExpressionPlayground';
import { LayoutInspector } from 'src/features/devtools/components/LayoutInspector/LayoutInspector';
import { NodeInspector } from 'src/features/devtools/components/NodeInspector/NodeInspector';
import { PDFPreviewButton } from 'src/features/devtools/components/PDFPreviewButton/PDFPreviewButton';
import { PermissionsEditor } from 'src/features/devtools/components/PermissionsEditor/PermissionsEditor';
import { VersionSwitcher } from 'src/features/devtools/components/VersionSwitcher/VersionSwitcher';
import { DevToolsActions } from 'src/features/devtools/data/devToolsSlice';
import { DevToolsTab } from 'src/features/devtools/data/types';
import classes from 'src/features/devtools/DevTools.module.css';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';

export const DevToolsControls = () => {
  const activeTab = useAppSelector((state) => state.devTools.activeTab);
  const dispatch = useAppDispatch();
  const setActiveTab = (tabName: DevToolsTab) => {
    dispatch(DevToolsActions.setActiveTab({ tabName }));
  };

  return (
    <div className={classes.tabs}>
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        items={[
          {
            name: DevToolsTab.General,
            content: (
              <div className={classes.page}>
                <PDFPreviewButton />
                <DevNavigationButtons />
                <DevHiddenFunctionality />
                <VersionSwitcher />
                <PermissionsEditor />
              </div>
            ),
          },
          {
            name: DevToolsTab.Layout,
            content: <LayoutInspector />,
          },
          {
            name: DevToolsTab.Components,
            content: <NodeInspector />,
          },
          {
            name: DevToolsTab.Expressions,
            content: <ExpressionPlayground />,
          },
        ]}
      />
    </div>
  );
};
