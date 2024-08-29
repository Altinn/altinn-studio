/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';

import { Button, Tabs } from '@digdir/designsystemet-react';
import { Close } from '@navikt/ds-icons';

import reusedClasses from 'src/features/devtools/components/LayoutInspector/LayoutInspector.module.css';
import { NodeHierarchy } from 'src/features/devtools/components/NodeInspector/NodeHierarchy';
import { NodeInspectorContextProvider } from 'src/features/devtools/components/NodeInspector/NodeInspectorContext';
import { ValidationInspector } from 'src/features/devtools/components/NodeInspector/ValidationInspector';
import { SplitView } from 'src/features/devtools/components/SplitView/SplitView';
import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { useCurrentView } from 'src/hooks/useNavigatePage';
import { implementsAnyValidation } from 'src/layout';
import { useGetPage, useNode } from 'src/utils/layout/NodesContext';
import { useNodeTraversal } from 'src/utils/layout/useNodeTraversal';

export const NodeInspector = () => {
  const pageKey = useCurrentView();
  const currentPage = useGetPage(pageKey);
  const selectedId = useDevToolsStore((state) => state.nodeInspector.selectedNodeId);
  const selectedNode = useNode(selectedId);
  const children = useNodeTraversal((t) => (currentPage ? t.with(currentPage).children() : undefined));
  const setSelected = useDevToolsStore((state) => state.actions.nodeInspectorSet);
  const focusLayoutInspector = useDevToolsStore((state) => state.actions.focusLayoutInspector);

  return (
    <SplitView
      direction='row'
      sizes={[300]}
    >
      <div className={reusedClasses.container}>
        <NodeHierarchy
          nodes={children}
          selected={selectedId}
          onClick={setSelected}
        />
      </div>
      {selectedId && selectedNode && (
        <>
          <div className={reusedClasses.closeButton}>
            <Button
              onClick={() => setSelected(undefined)}
              size='small'
              variant='tertiary'
              color='second'
              aria-label={'close'}
              icon={true}
            >
              <Close
                fontSize='1rem'
                aria-hidden
              />
            </Button>
          </div>
          <NodeInspectorContextProvider
            value={{
              node: selectedNode,
              selectedNodeId: selectedId,
              selectNode: setSelected,
            }}
          >
            <Tabs
              size='small'
              defaultValue='properties'
              className={reusedClasses.tabs}
            >
              <Tabs.List>
                <Tabs.Tab value='properties'>Egenskaper</Tabs.Tab>
                {implementsAnyValidation(selectedNode.def) && <Tabs.Tab value='validation'>Validering</Tabs.Tab>}
              </Tabs.List>
              <Tabs.Content value='properties'>
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
              </Tabs.Content>
              <Tabs.Content value='validation'>
                <div className={reusedClasses.scrollable}>
                  <ValidationInspector node={selectedNode} />
                </div>
              </Tabs.Content>
            </Tabs>
          </NodeInspectorContextProvider>
        </>
      )}
    </SplitView>
  );
};
