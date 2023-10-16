/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useCallback, useEffect } from 'react';

import { Button } from '@digdir/design-system-react';
import { Close } from '@navikt/ds-icons';

import reusedClasses from 'src/features/devtools/components/LayoutInspector/LayoutInspector.module.css';
import { NodeHierarchy } from 'src/features/devtools/components/NodeInspector/NodeHierarchy';
import { NodeInspectorContextProvider } from 'src/features/devtools/components/NodeInspector/NodeInspectorContext';
import { SplitView } from 'src/features/devtools/components/SplitView/SplitView';
import { DevToolsActions } from 'src/features/devtools/data/devToolsSlice';
import { DevToolsTab } from 'src/features/devtools/data/types';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useExprContext } from 'src/utils/layout/ExprContext';

export const NodeInspector = () => {
  const pages = useExprContext();
  const currentPage = pages?.current();
  const currentPageKey = currentPage?.top.myKey;
  const selectedId = useAppSelector((state) => state.devTools.nodeInspector.selectedNodeId);
  const selectedNode = selectedId ? currentPage?.findById(selectedId) : undefined;

  const dispatch = useAppDispatch();
  const setSelected = useCallback(
    (selectedNodeId: string | undefined) => {
      dispatch(
        DevToolsActions.nodeInspectorSet({
          selectedNodeId,
        }),
      );
    },
    [dispatch],
  );

  useEffect(() => {
    setSelected(undefined);
  }, [setSelected, currentPageKey]);

  return (
    <SplitView direction='row'>
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
                  dispatch(
                    DevToolsActions.layoutInspectorSet({
                      selectedComponentId: selectedNode?.item.baseComponentId || selectedNode?.item.id,
                    }),
                  );
                  dispatch(
                    DevToolsActions.setActiveTab({
                      tabName: DevToolsTab.Layout,
                    }),
                  );
                }}
              >
                Rediger konfigurasjonen i Layout-fanen
              </a>
            </div>
            <Button
              onClick={() => setSelected(undefined)}
              size='small'
              variant='quiet'
              color='second'
              aria-label={'close'}
              icon={<Close aria-hidden />}
            />
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
