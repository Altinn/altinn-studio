/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';

import { Tabs } from '@digdir/designsystemet-react';
import { XMarkIcon } from '@navikt/aksel-icons';

import { Button } from 'src/app-components/Button/Button';
import reusedClasses from 'src/features/devtools/components/LayoutInspector/LayoutInspector.module.css';
import { NodeHierarchy } from 'src/features/devtools/components/NodeInspector/NodeHierarchy';
import { NodeInspectorContextProvider } from 'src/features/devtools/components/NodeInspector/NodeInspectorContext';
import { ValidationInspector } from 'src/features/devtools/components/NodeInspector/ValidationInspector';
import { SplitView } from 'src/features/devtools/components/SplitView/SplitView';
import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { useCurrentView } from 'src/hooks/useNavigatePage';
import { implementsAnyValidation } from 'src/layout';
import { NodesInternal, useNode } from 'src/utils/layout/NodesContext';

export const NodeInspector = () => {
  const pageKey = useCurrentView();
  const selectedId = useDevToolsStore((state) => state.nodeInspector.selectedNodeId);
  const selectedNode = useNode(selectedId);
  const children = NodesInternal.useShallowSelector((state) =>
    Object.values(state.nodeData)
      .filter((data) => data.pageKey === pageKey && data.parentId === undefined) // Find top-level nodes
      .map((data) => data.layout.id),
  );
  const setSelected = useDevToolsStore((state) => state.actions.nodeInspectorSet);
  const focusLayoutInspector = useDevToolsStore((state) => state.actions.focusLayoutInspector);

  return (
    <SplitView
      direction='row'
      sizes={[300]}
    >
      <div className={reusedClasses.container}>
        <NodeHierarchy
          nodeIds={children?.map((id) => id) ?? []}
          selected={selectedId}
          onClick={setSelected}
        />
      </div>
      {selectedId && selectedNode && (
        <>
          <div className={reusedClasses.closeButtonContainer}>
            <div className={reusedClasses.closeButtonBackground}>
              <Button
                className={reusedClasses.closeButton}
                onClick={() => setSelected(undefined)}
                variant='tertiary'
                color='second'
                aria-label='close'
                icon={true}
              >
                <XMarkIcon
                  fontSize='1rem'
                  aria-hidden
                />
              </Button>
            </div>
          </div>
          <NodeInspectorContextProvider
            value={{
              node: selectedNode,
              selectedNodeId: selectedId,
              selectNode: setSelected,
            }}
          >
            <Tabs
              data-size='sm'
              defaultValue='properties'
              className={reusedClasses.tabs}
            >
              <Tabs.List className={reusedClasses.tabList}>
                <Tabs.Tab value='properties'>Egenskaper</Tabs.Tab>
                {implementsAnyValidation(selectedNode.def) && <Tabs.Tab value='validation'>Validering</Tabs.Tab>}
              </Tabs.List>
              <Tabs.Panel value='properties'>
                <div className={reusedClasses.properties}>
                  <div className={reusedClasses.headerLink}>
                    <a
                      href='#'
                      onClick={(e) => {
                        e.preventDefault();
                        focusLayoutInspector(selectedNode?.baseId);
                      }}
                    >
                      Rediger konfigurasjonen i Layout-fanen
                    </a>
                  </div>
                  {/*  eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {selectedNode.def.renderDevToolsInspector(selectedNode as any)}
                </div>
              </Tabs.Panel>
              <Tabs.Panel value='validation'>
                <div className={reusedClasses.scrollable}>
                  <ValidationInspector node={selectedNode} />
                </div>
              </Tabs.Panel>
            </Tabs>
          </NodeInspectorContextProvider>
        </>
      )}
    </SplitView>
  );
};
