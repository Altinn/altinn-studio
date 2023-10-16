import React from 'react';

import { Tabs } from '@digdir/design-system-react';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { DevHiddenFunctionality } from 'src/features/devtools/components/DevHiddenFunctionality/DevHiddenFunctionality';
import { DevLanguageSelector } from 'src/features/devtools/components/DevLanguageSelector/DevLanguageSelector';
import { DevNavigationButtons } from 'src/features/devtools/components/DevNavigationButtons/DevNavigationButtons';
import { DevToolsLogs } from 'src/features/devtools/components/DevToolsLogs/DevToolsLogs';
import { DownloadXMLButton } from 'src/features/devtools/components/DownloadXMLButton/DownloadXMLButton';
import { ExpressionPlayground } from 'src/features/devtools/components/ExpressionPlayground/ExpressionPlayground';
import { FeatureToggles } from 'src/features/devtools/components/FeatureToggles/FeatureToggles';
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
    <Tabs
      className={classes.tabs}
      size='small'
      value={activeTab}
      onChange={setActiveTab}
    >
      <Tabs.List className={classes.tabList}>
        <Tabs.Tab value={DevToolsTab.General}>{DevToolsTab.General}</Tabs.Tab>
        <Tabs.Tab value={DevToolsTab.Logs}>{DevToolsTab.Logs}</Tabs.Tab>
        <Tabs.Tab value={DevToolsTab.Layout}>{DevToolsTab.Layout}</Tabs.Tab>
        <Tabs.Tab value={DevToolsTab.Components}>{DevToolsTab.Components}</Tabs.Tab>
        <Tabs.Tab value={DevToolsTab.Expressions}>{DevToolsTab.Expressions}</Tabs.Tab>
        <Tabs.Tab value={DevToolsTab.FeatureToggles}>{DevToolsTab.FeatureToggles}</Tabs.Tab>
      </Tabs.List>
      <Tabs.Content value={DevToolsTab.General}>
        <div className={classes.page}>
          <PDFPreviewButton />
          <DevNavigationButtons />
          <DevHiddenFunctionality />
          <VersionSwitcher />
          <PermissionsEditor />
          <DevLanguageSelector />
          <DownloadXMLButton />
          <ReactQueryDevtools initialIsOpen={false} />
        </div>
      </Tabs.Content>
      <Tabs.Content value={DevToolsTab.Logs}>
        <DevToolsLogs />
      </Tabs.Content>
      <Tabs.Content value={DevToolsTab.Layout}>
        <LayoutInspector />
      </Tabs.Content>
      <Tabs.Content value={DevToolsTab.Components}>
        <NodeInspector />
      </Tabs.Content>
      <Tabs.Content value={DevToolsTab.Expressions}>
        <ExpressionPlayground />
      </Tabs.Content>
      <Tabs.Content value={DevToolsTab.FeatureToggles}>
        <FeatureToggles />
      </Tabs.Content>
    </Tabs>
  );
};
