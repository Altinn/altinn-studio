import React from 'react';

import cn from 'classnames';

import classes from 'src/features/devtools/components/NodeInspector/NodeInspector.module.css';
import { NodeInspectorDataField } from 'src/features/devtools/components/NodeInspector/NodeInspectorDataField';
import { NodeInspectorDataModelBindings } from 'src/features/devtools/components/NodeInspector/NodeInspectorDataModelBindings';
import { NodeInspectorTextResourceBindings } from 'src/features/devtools/components/NodeInspector/NodeInspectorTextResourceBindings';
import { useExternalItem } from 'src/utils/layout/hooks';
import { Hidden } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface DefaultNodeInspectorParams {
  node: LayoutNode;
  ignoredProperties?: string[];
}

export function DefaultNodeInspector({ node, ignoredProperties }: DefaultNodeInspectorParams) {
  // Hidden state is removed from the item by the hierarchy generator, but we simulate adding it back here (but only
  // if it's an expression). This allows app developers to inspect this as well.
  const _item = useNodeItem(node);
  const hidden = Hidden.useIsHidden(node);
  const component = useExternalItem(node.baseId);
  const hiddenIsExpression = Array.isArray(component?.hidden);
  const item = hiddenIsExpression ? { ..._item, hidden } : _item;

  const ignoredPropertiesFinal = new Set(['id', 'type'].concat(ignoredProperties ?? []));

  return (
    <dl className={cn(classes.propertyList, classes.mainPropertyList)}>
      {Object.keys(item).map((key) => {
        if (ignoredPropertiesFinal.has(key)) {
          return null;
        }

        const value = item[key];
        if (key === 'dataModelBindings' && typeof value === 'object' && Object.keys(value).length > 0) {
          return (
            <NodeInspectorDataModelBindings
              key={key}
              dataModelBindings={value}
            />
          );
        }

        if (key === 'textResourceBindings' && typeof value === 'object' && Object.keys(value).length > 0) {
          return (
            <NodeInspectorTextResourceBindings
              key={key}
              node={node}
              textResourceBindings={value}
            />
          );
        }

        if (node.isType('RepeatingGroup') && key === 'rows') {
          // Don't show rows for repeating groups, as they are extracted and shown in the inspector sidebar
          return null;
        }

        return (
          <NodeInspectorDataField
            key={key}
            path={[key]}
            property={key}
            value={value}
          />
        );
      })}
    </dl>
  );
}
