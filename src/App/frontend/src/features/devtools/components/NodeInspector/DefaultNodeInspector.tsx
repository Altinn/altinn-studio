import React from 'react';

import cn from 'classnames';

import classes from 'src/features/devtools/components/NodeInspector/NodeInspector.module.css';
import { NodeInspectorDataField } from 'src/features/devtools/components/NodeInspector/NodeInspectorDataField';
import { NodeInspectorDataModelBindings } from 'src/features/devtools/components/NodeInspector/NodeInspectorDataModelBindings';
import { NodeInspectorTextResourceBindings } from 'src/features/devtools/components/NodeInspector/NodeInspectorTextResourceBindings';
import { useIsHidden } from 'src/utils/layout/hidden';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';

interface DefaultNodeInspectorParams {
  baseComponentId: string;
  ignoredProperties?: string[];
}

export function DefaultNodeInspector({ baseComponentId, ignoredProperties }: DefaultNodeInspectorParams) {
  const config = useComponentConfig(baseComponentId);
  const dataModelBindings = useDataModelBindingsFor(baseComponentId);
  const hidden = useIsHidden(baseComponentId);

  const ignoredPropertiesFinal = new Set(['id', 'type'].concat(ignoredProperties ?? []));

  return (
    <dl className={cn(classes.propertyList, classes.mainPropertyList)}>
      {Object.keys(config).map((key) => {
        if (ignoredPropertiesFinal.has(key)) {
          return null;
        }

        const value =
          key === 'hidden' && Array.isArray(config.hidden)
            ? hidden
            : key === 'dataModelBindings'
              ? dataModelBindings
              : config[key];
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
