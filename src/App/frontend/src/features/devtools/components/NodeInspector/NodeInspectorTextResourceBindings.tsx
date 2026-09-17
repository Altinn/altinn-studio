import React from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import classes from 'src/features/devtools/components/NodeInspector/NodeInspector.module.css';
import { Value } from 'src/features/devtools/components/NodeInspector/NodeInspectorDataField';
import { canBeExpression } from 'src/features/expressions/validation';
import { useTextResources } from 'src/features/language/textResources/TextResourcesProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { RepGroupHooks } from 'src/layout/RepeatingGroup/utils';
import { DataModelLocationProvider } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useEvalExpressionMap } from 'src/utils/layout/useEvalExpression';
import type { ITextResourceBindings } from 'src/layout/layout';
import type { GroupExpressions } from 'src/layout/RepeatingGroup/types';

interface Props {
  baseComponentId: string;
  textResourceBindings: ITextResourceBindings;
}

export function NodeInspectorTextResourceBindings(props: Props) {
  const component = useComponentConfig(props.baseComponentId);
  if (component.type === 'RepeatingGroup') {
    return <NodeNodeInspectorTextResourceBindingsForFirstRow {...props} />;
  }

  return <NodeInspectorTextResourceBindingsInner {...props} />;
}

function NodeNodeInspectorTextResourceBindingsForFirstRow(props: Props) {
  const row = RepGroupHooks.useAllBaseRows(props.baseComponentId)[0];
  const groupBinding = useDataModelBindingsFor(props.baseComponentId, 'RepeatingGroup').group;
  if (!row) {
    return <NodeInspectorTextResourceBindingsInner {...props} />;
  }
  return (
    <DataModelLocationProvider
      groupBinding={groupBinding}
      rowIndex={row.index}
    >
      <NodeInspectorRowTexts {...props} />
    </DataModelLocationProvider>
  );
}

function NodeInspectorRowTexts(props: Props) {
  const config = useComponentConfig(props.baseComponentId, 'RepeatingGroup');
  const definitions = Expressions.RepeatingGroup.textResourceBindings;
  const firstRowTexts = useEvalExpressionMap(
    {
      editButtonClose: config.textResourceBindings?.editButtonClose,
      editButtonOpen: config.textResourceBindings?.editButtonOpen,
      saveAndNextButton: config.textResourceBindings?.saveAndNextButton,
      saveButton: config.textResourceBindings?.saveButton,
    },
    {
      editButtonClose: definitions.editButtonClose,
      editButtonOpen: definitions.editButtonOpen,
      saveAndNextButton: definitions.saveAndNextButton,
      saveButton: definitions.saveButton,
    },
  );
  return (
    <NodeInspectorTextResourceBindingsInner
      {...props}
      firstRowExpr={{ textResourceBindings: firstRowTexts }}
    />
  );
}

function NodeInspectorTextResourceBindingsInner({
  baseComponentId,
  textResourceBindings,
  firstRowExpr,
}: Props & { firstRowExpr?: GroupExpressions }) {
  const textResources = useTextResources();
  const { langAsString } = useLanguage();
  const config = useComponentConfig(baseComponentId);
  const item = config.type === 'RepeatingGroup' ? config : undefined;

  let actualTextResourceBindings = textResourceBindings || {};
  let isRepGroup = false;
  if (item) {
    // Text resource bindings are resolved per-row for repeating groups. We'll show the
    // first row here, and inform the user.
    isRepGroup = true;
    if (firstRowExpr && firstRowExpr?.textResourceBindings) {
      actualTextResourceBindings = {
        ...actualTextResourceBindings,
        ...firstRowExpr.textResourceBindings,
      };
    }
  }

  return (
    <Value
      property='textResourceBindings'
      collapsible={true}
    >
      <dl className={classes.propertyList}>
        {isRepGroup && (
          <div>
            Obs! Tekstressurser for repeterende grupper evalueres per rad. Her vises tekstressursene for den første
            raden. <br />
            Dersom ingen rad er åpen, vil ikke alltid tekstressursene kunne vises.
          </div>
        )}
        {Object.keys(actualTextResourceBindings).map((key) => {
          const inResources = textResources[actualTextResourceBindings[key]];
          const value = actualTextResourceBindings[key];
          const isExpression = canBeExpression(value, true);

          return (
            <Value
              key={key}
              property={key}
            >
              <em>Råverdi:</em> {isExpression ? '[uttrykk]' : value}
              {!isExpression && (
                <>
                  <br />
                  <em>Tekstressurs:</em> {inResources ? 'Ja' : 'Nei'}
                  {inResources && (
                    <>
                      <br />
                      <em>Resultat:</em> {langAsString(value)}
                    </>
                  )}
                </>
              )}
            </Value>
          );
        })}
      </dl>
    </Value>
  );
}
