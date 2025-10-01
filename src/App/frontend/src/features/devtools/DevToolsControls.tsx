import React from 'react';

import { Tabs } from '@digdir/designsystemet-react';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { DevHiddenFunctionality } from 'src/features/devtools/components/DevHiddenFunctionality/DevHiddenFunctionality';
import { DevLanguageSelector } from 'src/features/devtools/components/DevLanguageSelector/DevLanguageSelector';
import { DevNavigationButtons } from 'src/features/devtools/components/DevNavigationButtons/DevNavigationButtons';
import { DevToolsLogs } from 'src/features/devtools/components/DevToolsLogs/DevToolsLogs';
import { DownloadXMLButton } from 'src/features/devtools/components/DownloadXMLButton/DownloadXMLButton';
import { ExpressionPlayground } from 'src/features/devtools/components/ExpressionPlayground/ExpressionPlayground';
import { ComponentSelector } from 'src/features/devtools/components/LayoutInspector/ComponentSelector';
// There are no beta features at this time
// import { FeatureToggles } from 'src/features/devtools/components/FeatureToggles/FeatureToggles';
import { LayoutInspector } from 'src/features/devtools/components/LayoutInspector/LayoutInspector';
import { NodeInspector } from 'src/features/devtools/components/NodeInspector/NodeInspector';
import { PDFPreviewButton } from 'src/features/devtools/components/PDFPreviewButton/PDFPreviewButton';
import { PermissionsEditor } from 'src/features/devtools/components/PermissionsEditor/PermissionsEditor';
import { VersionSwitcher } from 'src/features/devtools/components/VersionSwitcher/VersionSwitcher';
import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { DevToolsTab } from 'src/features/devtools/data/types';
import classes from 'src/features/devtools/DevTools.module.css';
import { useIsInFormContext } from 'src/features/form/FormContext';

export const DevToolsControls = () => {
  const activeTab = useDevToolsStore((state) => state.activeTab);
  const setActiveTab = useDevToolsStore((state) => state.actions.setActiveTab);
  const isInForm = useIsInFormContext();

  return (
    <Tabs
      className={classes.tabs}
      data-size='sm'
      value={activeTab}
      onChange={setActiveTab}
    >
      <Tabs.List className={classes.tabList}>
        <Tabs.Tab value={DevToolsTab.General}>{DevToolsTab.General}</Tabs.Tab>
        <Tabs.Tab value={DevToolsTab.Logs}>{DevToolsTab.Logs}</Tabs.Tab>
        {isInForm && (
          <Tabs.Tab value={DevToolsTab.Layout}>
            {DevToolsTab.Layout}
            <ComponentSelector type='component' />
          </Tabs.Tab>
        )}
        {isInForm && (
          <Tabs.Tab value={DevToolsTab.Components}>
            {DevToolsTab.Components}
            <ComponentSelector type='node' />
          </Tabs.Tab>
        )}
        {isInForm && <Tabs.Tab value={DevToolsTab.Expressions}>{DevToolsTab.Expressions}</Tabs.Tab>}
        {/* <Tabs.Tab value={DevToolsTab.FeatureToggles}>{DevToolsTab.FeatureToggles}</Tabs.Tab> */}
      </Tabs.List>
      <Tabs.Panel
        className={classes.tabPanel}
        value={DevToolsTab.General}
      >
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
      </Tabs.Panel>
      <Tabs.Panel
        className={classes.tabPanel}
        value={DevToolsTab.Logs}
      >
        <DevToolsLogs />
      </Tabs.Panel>
      {isInForm && (
        <Tabs.Panel
          className={classes.tabPanel}
          value={DevToolsTab.Layout}
        >
          <LayoutInspector />
        </Tabs.Panel>
      )}
      {isInForm && (
        <Tabs.Panel
          className={classes.tabPanel}
          value={DevToolsTab.Components}
        >
          <NodeInspector />
        </Tabs.Panel>
      )}
      {isInForm && (
        <Tabs.Panel
          className={classes.tabPanel}
          value={DevToolsTab.Expressions}
        >
          <ExpressionPlayground />
        </Tabs.Panel>
      )}
      {
        // <Tabs.Content value={DevToolsTab.FeatureToggles}>
        //   <FeatureToggles />
        // </Tabs.Content>
      }
    </Tabs>
  );
};
