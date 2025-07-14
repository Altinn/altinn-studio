import React from 'react';

import cn from 'classnames';

import classes from 'src/features/devtools/components/NodeInspector/NodeInspector.module.css';
import { NodeInspectorDataField } from 'src/features/devtools/components/NodeInspector/NodeInspectorDataField';
import { NodeInspectorDataModelBindings } from 'src/features/devtools/components/NodeInspector/NodeInspectorDataModelBindings';
import { NodeInspectorTextResourceBindings } from 'src/features/devtools/components/NodeInspector/NodeInspectorTextResourceBindings';
import { useExternalItem } from 'src/utils/layout/hooks';
import { Hidden } from 'src/utils/layout/NodesContext';
import { useItemFor } from 'src/utils/layout/useNodeItem';

interface DefaultNodeInspectorParams {
  baseComponentId: string;
  ignoredProperties?: string[];
}

export function DefaultNodeInspector({ baseComponentId, ignoredProperties }: DefaultNodeInspectorParams) {
  // Hidden state is removed from the item by the hierarchy generator, but we simulate adding it back here (but only
  // if it's an expression). This allows app developers to inspect this as well.
  const _item = useItemFor(baseComponentId);
  const hidden = Hidden.useIsHidden(_item.id, 'node');
  const component = useExternalItem(baseComponentId);
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
              baseComponentId={baseComponentId}
              textResourceBindings={value}
            />
          );
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
