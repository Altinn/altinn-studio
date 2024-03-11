/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';

import { Button } from '@digdir/design-system-react';
import { Close } from '@navikt/ds-icons';

import reusedClasses from 'src/features/devtools/components/LayoutInspector/LayoutInspector.module.css';
import { NodeHierarchy } from 'src/features/devtools/components/NodeInspector/NodeHierarchy';
import { NodeInspectorContextProvider } from 'src/features/devtools/components/NodeInspector/NodeInspectorContext';
import { SplitView } from 'src/features/devtools/components/SplitView/SplitView';
import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
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
        <div className={reusedClasses.properties}>
          <div className={reusedClasses.header}>
            <h3>Egenskaper for {selectedId}</h3>
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
            {selectedNode.def.renderDevToolsInspector(selectedNode as any)}
          </NodeInspectorContextProvider>
        </div>
      )}
    </SplitView>
  );
};
