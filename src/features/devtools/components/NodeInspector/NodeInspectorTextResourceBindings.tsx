import React from 'react';

import classes from 'src/features/devtools/components/NodeInspector/NodeInspector.module.css';
import { Value } from 'src/features/devtools/components/NodeInspector/NodeInspectorDataField';
import { canBeExpression } from 'src/features/expressions/validation';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useLanguage } from 'src/hooks/useLanguage';
import type { ITextResourceBindings } from 'src/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface Props {
  node: LayoutNode;
  textResourceBindings: ITextResourceBindings;
}

export function NodeInspectorTextResourceBindings({ node, textResourceBindings }: Props) {
  const textResources = useAppSelector((state) => state.textResources.resources);
  const { langAsString } = useLanguage();

  let actualTextResourceBindings = textResourceBindings;
  let isRepGroup = false;
  if (node.isRepGroup()) {
    // Text resource bindings are resolved per-row for repeating groups. We'll show the
    // first row here, and inform the user.
    isRepGroup = true;
    const firstRow = node.item.rows[0];
    if (firstRow && firstRow.groupExpressions?.textResourceBindings) {
      actualTextResourceBindings = firstRow.groupExpressions?.textResourceBindings;
    }
  }

  return (
    <Value
      property={'textResourceBindings'}
      collapsible={true}
      className={classes.typeObject}
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
          const inResources = textResources.find((resource) => resource.id === textResourceBindings[key]);
          const value = actualTextResourceBindings[key];
          const isExpression = canBeExpression(value, true);

          return (
            <Value
              key={key}
              property={key}
              className={classes.typeLongString}
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
