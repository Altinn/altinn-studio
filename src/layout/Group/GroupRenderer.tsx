import React from 'react';

import { DisplayGroupContainer } from 'src/features/form/containers/DisplayGroupContainer';
import { GroupContainer } from 'src/features/form/containers/GroupContainer';
import { GenericComponent } from 'src/layout/GenericComponent';
import { PanelGroupContainer } from 'src/layout/Panel/PanelGroupContainer';
import type { PropsFromGenericComponent } from 'src/layout';

export type GroupRendererProps = PropsFromGenericComponent<'Group'>;

export function GroupRenderer({ node }: GroupRendererProps) {
  const isRepeatingGroup = node.item.maxCount && node.item.maxCount > 1;
  if (isRepeatingGroup) {
    return (
      <GroupContainer
        id={node.item.id}
        key={node.item.id}
      />
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
