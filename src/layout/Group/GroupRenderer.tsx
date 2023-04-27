import React from 'react';

import { GenericComponent } from 'src/layout/GenericComponent';
import { DisplayGroupContainer } from 'src/layout/Group/DisplayGroupContainer';
import { GroupContainer } from 'src/layout/Group/GroupContainer';
import { RepeatingGroupsFocusProvider } from 'src/layout/Group/RepeatingGroupsFocusContext';
import { PanelGroupContainer } from 'src/layout/Panel/PanelGroupContainer';
import type { PropsFromGenericComponent } from 'src/layout';

export type GroupRendererProps = PropsFromGenericComponent<'Group'>;

export function GroupRenderer({ node }: GroupRendererProps) {
  const isRepeatingGroup = node.item.maxCount && node.item.maxCount > 1;
  if (isRepeatingGroup) {
    return (
      <RepeatingGroupsFocusProvider>
        <GroupContainer
          id={node.item.id}
          key={node.item.id}
        />
      </RepeatingGroupsFocusProvider>
    );
  }

  if (node.item.panel) {
    return (
      <PanelGroupContainer
        key={node.item.id}
        id={node.item.id}
      />
    );
  }

  // Treat as regular components
  return (
    <DisplayGroupContainer
      key={node.item.id}
      groupNode={node}
      renderLayoutNode={(n) => (
        <GenericComponent
          key={n.item.id}
          node={n}
        />
      )}
    />
  );
}
