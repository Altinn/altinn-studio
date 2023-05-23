import React from 'react';

import dot from 'dot-object';

import classes from 'src/features/devtools/components/NodeInspector/NodeInspector.module.css';
import { Value } from 'src/features/devtools/components/NodeInspector/NodeInspectorDataField';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useBindingSchema } from 'src/hooks/useBindingSchema';
import type { IDataModelBindings } from 'src/layout/layout';

interface Props {
  dataModelBindings: IDataModelBindings;
}

export function NodeInspectorDataModelBindings({ dataModelBindings }: Props) {
  const schema = useBindingSchema(dataModelBindings);
  const formData = useAppSelector((state) => state.formData.formData);
  const asObject = dot.object(structuredClone(formData || {}));

  return (
    <Value
      property={'dataModelBindings'}
      collapsible={true}
      className={classes.typeObject}
    >
      <dl className={classes.propertyList}>
        {Object.keys(dataModelBindings).map((key) => (
          <Value
            key={key}
            property={key}
            className={classes.typeLongString}
          >
            <em>Råverdi: </em>
            {dataModelBindings[key]}
            <br />
            <em>Resultat: </em>
            <div className={classes.json}>
              {JSON.stringify(dot.pick(dataModelBindings[key], asObject) || null, null, 2)}
            </div>
            <br />
            <em>Datamodell: </em>
            <div className={classes.json}>{JSON.stringify(schema?.[key] || null, null, 2)}</div>
          </Value>
        ))}
      </dl>
    </Value>
  );
}
