import React from 'react';

import classes from 'src/features/devtools/components/NodeInspector/NodeInspector.module.css';
import { Value } from 'src/features/devtools/components/NodeInspector/NodeInspectorDataField';
import { canBeExpression } from 'src/features/expressions/validation';
import { useTextResources } from 'src/features/language/textResources/TextResourcesProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { RepGroupHooks } from 'src/layout/RepeatingGroup/utils';
import { useItemIfType } from 'src/utils/layout/useNodeItem';
import type { ITextResourceBindings } from 'src/layout/layout';
import type { GroupExpressions } from 'src/layout/RepeatingGroup/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface Props {
  node: LayoutNode;
  textResourceBindings: ITextResourceBindings;
}

export function NodeInspectorTextResourceBindings({ node, textResourceBindings }: Props) {
  if (node.isType('RepeatingGroup')) {
    return (
      <NodeNodeInspectorTextResourceBindingsForFirstRow
        node={node}
        textResourceBindings={textResourceBindings}
      />
    );
  }

  return (
    <NodeInspectorTextResourceBindingsInner
      node={node}
      textResourceBindings={textResourceBindings}
    />
  );
}

function NodeNodeInspectorTextResourceBindingsForFirstRow({
  node,
  textResourceBindings,
}: Props & { node: LayoutNode<'RepeatingGroup'> }) {
  const firstRowExpr = RepGroupHooks.useRowWithExpressions(node.baseId, 'first');
  return (
    <NodeInspectorTextResourceBindingsInner
      node={node}
      textResourceBindings={textResourceBindings}
      firstRowExpr={firstRowExpr}
    />
  );
}

function NodeInspectorTextResourceBindingsInner({
  node,
  textResourceBindings,
  firstRowExpr,
}: Props & { firstRowExpr?: GroupExpressions }) {
  const textResources = useTextResources();
  const { langAsString } = useLanguage();
  const item = useItemIfType(node.baseId, 'RepeatingGroup');

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
