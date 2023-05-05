import React from 'react';

import { GenericComponent } from 'src/layout/GenericComponent';
import { DisplayGroupContainer } from 'src/layout/Group/DisplayGroupContainer';
import { GroupContainer } from 'src/layout/Group/GroupContainer';
import { RepeatingGroupsFocusProvider } from 'src/layout/Group/RepeatingGroupsFocusContext';
import { PanelGroupContainer } from 'src/layout/Panel/PanelGroupContainer';
import { PanelReferenceGroupContainer } from 'src/layout/Panel/PanelReferenceGroupContainer';
import type { PropsFromGenericComponent } from 'src/layout';

export type GroupRendererProps = PropsFromGenericComponent<'Group'>;

export function GroupRenderer({ node }: GroupRendererProps) {
  const isRepeatingGroup = node.isRepGroup();
  if (isRepeatingGroup) {
    return (
      <RepeatingGroupsFocusProvider>
        <GroupContainer
          node={node}
          key={node.item.id}
        />
      </RepeatingGroupsFocusProvider>
    );
  }

  // panel with groupReference
  if (node.item.panel?.groupReference) {
    return (
      <PanelReferenceGroupContainer
        key={node.item.id}
        id={node.item.id}
      />
    );
  }

  // regular panel group
  if (node.item.panel) {
    return (
      <PanelGroupContainer
        key={node.item.id}
        node={node}
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
