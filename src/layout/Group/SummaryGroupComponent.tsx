import React from 'react';

import cn from 'classnames';

import { ErrorPaper } from 'src/components/message/ErrorPaper';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { getLanguageFromKey } from 'src/language/sharedLanguage';
import { DisplayGroupContainer } from 'src/layout/Group/DisplayGroupContainer';
import classes from 'src/layout/Group/SummaryGroupComponent.module.css';
import { ComponentType } from 'src/layout/LayoutComponent';
import { EditButton } from 'src/layout/Summary/EditButton';
import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import type { ISummaryComponent } from 'src/layout/Summary/SummaryComponent';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface ISummaryGroupComponent {
  changeText: string | null;
  onChangeClick: () => void;
  summaryNode: LayoutNodeFromType<'Summary'>;
  targetNode: LayoutNodeFromType<'Group'>;
  overrides?: ISummaryComponent['overrides'];
}

export function SummaryGroupComponent({
  onChangeClick,
  changeText,
  summaryNode,
  targetNode,
  overrides,
}: ISummaryGroupComponent) {
  const textResourceBindings = targetNode.item.textResourceBindings;
  const excludedChildren = summaryNode.item.excludedChildren;
  const display = overrides?.display || summaryNode.item.display;

  const inExcludedChildren = (n: LayoutNode) =>
    excludedChildren &&
    (excludedChildren.includes(n.item.id) || excludedChildren.includes(`${n.item.baseComponentId}`));

  const textResources = useAppSelector((state) => state.textResources.resources);
  const language = useAppSelector((state) => state.language.language);
  const groupHasErrors = targetNode.hasDeepValidationMessages();

  const title = React.useMemo(() => {
    if (textResources && textResourceBindings) {
      const titleKey = textResourceBindings.title;
      if (!titleKey) {
        return '';
      }

      return getTextFromAppOrDefault(titleKey, textResources, language || {}, [], true);
    }

    return '';
  }, [textResources, textResourceBindings, language]);

  const rowIndexes: (number | undefined)[] = [];
  if (targetNode.isRepGroup()) {
    for (const row of targetNode.item.rows) {
      row && rowIndexes.push(row.index);
    }
  } else {
    // This trick makes non-repeating groups work in Summary as well. They don't have any rows, but if we add this
    // to rowIndexes we'll make our later code call groupNode.children() once with rowIndex `undefined`, which retrieves
    // all the non-repeating children and renders a group summary as if it was a repeating group with one row.
    rowIndexes.push(undefined);
  }

  if (summaryNode.item.largeGroup && overrides?.largeGroup !== false && rowIndexes.length) {
    return (
      <>
        {rowIndexes.map((idx) => {
          if (idx !== undefined && targetNode.isRepGroup() && targetNode.item.rows[idx]?.groupExpressions?.hiddenRow) {
            return null;
          }

          return (
            <DisplayGroupContainer
              key={`summary-${targetNode.item.id}-${idx}`}
              id={`summary-${targetNode.item.id}-${idx}`}
              groupNode={targetNode}
              onlyRowIndex={idx}
              renderLayoutNode={(n) => {
                if (inExcludedChildren(n) || n.isHidden()) {
                  return null;
                }

                return (
                  <SummaryComponent
                    key={n.item.id}
                    summaryNode={summaryNode}
                    overrides={{
                      ...overrides,
                      targetNode: n,
                      grid: {},
                      largeGroup: false,
                    }}
                  />
                );
              }}
            />
          );
        })}
      </>
    );
  }

  if (!language) {
    return null;
  }
  return (
    <>
      <div
        data-testid={'summary-group-component'}
        style={{ width: '100%' }}
      >
        <div className={classes.container}>
          <span
            className={cn(classes.label, groupHasErrors && !display?.hideValidationMessages && classes.labelWithError)}
          >
            {title}
          </span>

          {!display?.hideChangeButton ? (
            <EditButton
              onClick={onChangeClick}
              editText={changeText}
              label={title}
            />
          ) : null}
        </div>
        <div style={{ width: '100%' }}>
          {rowIndexes.length === 0 ? (
            <span className={classes.emptyField}>{getLanguageFromKey('general.empty_summary', language)}</span>
          ) : (
            rowIndexes.map((idx) => {
              const childSummaryComponents = targetNode
                .children(undefined, idx)
                .filter((n) => !inExcludedChildren(n))
                .map((child) => {
                  if (child.isHidden() || !child.isComponentType(ComponentType.Form)) {
                    return;
                  }
                  const RenderCompactSummary = child.def.renderCompactSummary.bind(child.def);
                  return (
                    <RenderCompactSummary
                      onChangeClick={onChangeClick}
                      changeText={changeText}
                      key={child.item.id}
                      targetNode={child as any}
                      summaryNode={summaryNode}
                      overrides={{}}
                    />
                  );
                });

              return (
                <div
                  key={`row-${idx}`}
                  className={classes.border}
                >
                  {childSummaryComponents}
                </div>
              );
            })
          )}
        </div>
      </div>

      {groupHasErrors && !display?.hideValidationMessages && (
        <div className={classes.gridStyle}>
          <ErrorPaper message={getLanguageFromKey('group.row_error', language)} />
          <div>
            {!display?.hideChangeButton && (
              <button
                className={classes.link}
                onClick={onChangeClick}
                type='button'
              >
                {getTextFromAppOrDefault('form_filler.summary_go_to_correct_page', textResources, language, [], true)}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
