/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';

import { Button, Tabs } from '@digdir/design-system-react';
import { Close } from '@navikt/ds-icons';

import reusedClasses from 'src/features/devtools/components/LayoutInspector/LayoutInspector.module.css';
import { NodeHierarchy } from 'src/features/devtools/components/NodeInspector/NodeHierarchy';
import { NodeInspectorContextProvider } from 'src/features/devtools/components/NodeInspector/NodeInspectorContext';
import { ValidationInspector } from 'src/features/devtools/components/NodeInspector/ValidationInspector';
import { SplitView } from 'src/features/devtools/components/SplitView/SplitView';
import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { implementsAnyValidation } from 'src/layout';
import { useNodes } from 'src/utils/layout/NodesContext';

export const NodeInspector = () => {
  const pages = useNodes();
  const currentPage = pages?.current();
  const selectedId = useDevToolsStore((state) => state.nodeInspector.selectedNodeId);
  const selectedNode = selectedId ? currentPage?.findById(selectedId) : undefined;
  const setSelected = useDevToolsStore((state) => state.actions.nodeInspectorSet);
  const focusLayoutInspector = useDevToolsStore((state) => state.actions.focusLayoutInspector);

  return (
    <SplitView
      direction='row'
      sizes={[300]}
    >
      <div className={reusedClasses.container}>
        <NodeHierarchy
          nodes={currentPage?.children()}
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
              <Close aria-hidden />
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
                        focusLayoutInspector(selectedNode?.item.baseComponentId || selectedNode?.item.id);
                      }}
                    >
                      Rediger konfigurasjonen i Layout-fanen
                    </a>
                  </div>
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
