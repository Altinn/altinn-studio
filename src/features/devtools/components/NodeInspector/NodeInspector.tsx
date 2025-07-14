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
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { useCurrentView } from 'src/hooks/useNavigatePage';
import { getComponentDef, implementsAnyValidation } from 'src/layout';
import { DataModelLocationProviderFromNode } from 'src/utils/layout/DataModelLocation';
import { splitDashedKey } from 'src/utils/splitDashedKey';

export const NodeInspector = () => {
  const pageKey = useCurrentView();
  const selectedId = useDevToolsStore((state) => state.nodeInspector.selectedNodeId);
  const { baseComponentId } = splitDashedKey(selectedId ?? '');
  const lookups = useLayoutLookups();
  const def = baseComponentId ? getComponentDef(lookups.getComponent(baseComponentId).type) : undefined;
  const children = pageKey ? lookups.topLevelComponents[pageKey] : undefined;
  const setSelected = useDevToolsStore((state) => state.actions.nodeInspectorSet);
  const focusLayoutInspector = useDevToolsStore((state) => state.actions.focusLayoutInspector);

  return (
    <SplitView
      direction='row'
      sizes={[300]}
    >
      <div className={reusedClasses.container}>
        <NodeHierarchy
          baseIds={children?.map((id) => id) ?? []}
          selected={selectedId}
          onClick={setSelected}
        />
      </div>
      {selectedId && def && baseComponentId && (
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
              selectedNodeId: selectedId,
              selectedBaseId: baseComponentId,
              selectNode: setSelected,
            }}
          >
            <DataModelLocationProviderFromNode nodeId={selectedId}>
              <Tabs
                data-size='sm'
                defaultValue='properties'
                className={reusedClasses.tabs}
              >
                <Tabs.List className={reusedClasses.tabList}>
                  <Tabs.Tab value='properties'>Egenskaper</Tabs.Tab>
                  {implementsAnyValidation(def) && <Tabs.Tab value='validation'>Validering</Tabs.Tab>}
                </Tabs.List>
                <Tabs.Panel value='properties'>
                  <div className={reusedClasses.properties}>
                    <div className={reusedClasses.headerLink}>
                      <a
                        href='#'
                        onClick={(e) => {
                          e.preventDefault();
                          focusLayoutInspector(baseComponentId);
                        }}
                      >
                        Rediger konfigurasjonen i Layout-fanen
                      </a>
                    </div>
                    <DataModelLocationProviderFromNode nodeId={selectedId}>
                      {def.renderDevToolsInspector(baseComponentId)}
                    </DataModelLocationProviderFromNode>
                  </div>
                </Tabs.Panel>
                <Tabs.Panel value='validation'>
                  <div className={reusedClasses.scrollable}>
                    <ValidationInspector baseComponentId={baseComponentId} />
                  </div>
                </Tabs.Panel>
              </Tabs>
            </DataModelLocationProviderFromNode>
          </NodeInspectorContextProvider>
        </>
      )}
    </SplitView>
  );
};
