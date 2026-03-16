import React from 'react';

import { useBindingSchema } from 'src/features/datamodel/useBindingSchema';
import classes from 'src/features/devtools/components/NodeInspector/NodeInspector.module.css';
import { Value } from 'src/features/devtools/components/NodeInspector/NodeInspectorDataField';
import { FD } from 'src/features/formData/FormDataWrite';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { IDataModelBindings } from 'src/layout/layout';

interface Props {
  dataModelBindings: IDataModelBindings;
}

export function NodeInspectorDataModelBindings({ dataModelBindings }: Props) {
  const schema = useBindingSchema(dataModelBindings);
  const bindings = dataModelBindings as Record<string, IDataModelReference>;
  const results = FD.useFreshBindings(bindings, 'raw');
  return (
    <Value
      property='dataModelBindings'
      collapsible={true}
    >
      <dl className={classes.propertyList}>
        {Object.keys(bindings).map((key) => (
          <Value
            key={key}
            property={key}
          >
            <em>Datamodell: </em>
            {bindings[key].dataType}
            <br />
            <em>Sti: </em>
            {bindings[key].field}
            <br />
            <em>Resultat: </em>
            <div className={classes.json}>{JSON.stringify(results[key], null, 2)}</div>
            <br />
            <em>Datamodell: </em>
            <div className={classes.json}>{JSON.stringify(schema?.[key] || null, null, 2)}</div>
          </Value>
        ))}
      </dl>
    </Value>
  );
}
