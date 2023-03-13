import React from 'react';

import { Grid, makeStyles, Typography } from '@material-ui/core';
import cn from 'classnames';

import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { ErrorPaper } from 'src/components/message/ErrorPaper';
import { EditButton } from 'src/components/summary/EditButton';
import { SummaryComponent } from 'src/components/summary/SummaryComponent';
import { DisplayGroupContainer } from 'src/features/form/containers/DisplayGroupContainer';
import { getLanguageFromKey } from 'src/language/sharedLanguage';
import { ComponentType } from 'src/layout';
import { FormComponent } from 'src/layout/LayoutComponent';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import type { ISummaryComponent } from 'src/components/summary/SummaryComponent';
import type { LayoutNode } from 'src/utils/layout/hierarchy';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';

export interface ISummaryGroupComponent {
  changeText: string | null;
  onChangeClick: () => void;
  summaryNode: LayoutNodeFromType<'Summary'>;
  targetNode: LayoutNodeFromType<'Group'>;
  overrides?: ISummaryComponent['overrides'];
}

const gridStyle = {
  paddingTop: '12px',
};

const useStyles = makeStyles({
  border: {
    border: '2px solid #EFEFEF',
    marginTop: 12,
    marginBottom: 12,
    padding: 12,
    '@media print': {
      pageBreakInside: 'avoid',
    },
  },
  container: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontWeight: 500,
    fontSize: '1.125rem',
    '& p': {
      fontWeight: 500,
      fontSize: '1.125rem',
    },
  },
  labelWithError: {
    color: AltinnAppTheme.altinnPalette.primary.red,
    '& p': {
      color: AltinnAppTheme.altinnPalette.primary.red,
    },
  },
  link: {
    background: 'none',
    border: 'none',
    borderBottom: '2px solid #008FD6',
    cursor: 'pointer',
    paddingLeft: 0,
  },
  emptyField: {
    fontStyle: 'italic',
    fontSize: '1rem',
    lineHeight: 1.6875,
    marginTop: 4,
  },
});

export function SummaryGroupComponent({
  onChangeClick,
  changeText,
  summaryNode,
  targetNode,
  overrides,
}: ISummaryGroupComponent) {
  const classes = useStyles();
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
  if ('rows' in targetNode.item) {
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
          <Typography
            variant='body1'
            className={cn(classes.label, groupHasErrors && !display?.hideValidationMessages && classes.labelWithError)}
            component='span'
          >
            {title}
          </Typography>

          {!display?.hideChangeButton ? (
            <EditButton
              onClick={onChangeClick}
              editText={changeText}
            />
          ) : null}
        </div>
        <div style={{ width: '100%' }}>
          {rowIndexes.length === 0 ? (
            <Typography
              variant='body1'
              className={classes.emptyField}
              component='p'
            >
              {getLanguageFromKey('general.empty_summary', language)}
            </Typography>
          ) : (
            rowIndexes.map((idx) => {
              const childSummaryComponents = targetNode
                .children(undefined, idx)
                .filter((n) => !inExcludedChildren(n))
                .filter((node) => node.getComponent().getComponentType() === ComponentType.Form)
                .map((child) => {
                  const component = child.getComponent();
                  if (child.isHidden() || !(component instanceof FormComponent)) {
                    return;
                  }
                  const RenderCompactSummary = component.renderCompactSummary.bind(component);
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
        <Grid
          container={true}
          style={gridStyle}
        >
          <ErrorPaper message={getLanguageFromKey('group.row_error', language)} />
          <Grid
            item={true}
            xs={12}
          >
            {!display?.hideChangeButton && (
              <button
                className={classes.link}
                onClick={onChangeClick}
                type='button'
              >
                {getTextFromAppOrDefault('form_filler.summary_go_to_correct_page', textResources, language, [], true)}
              </button>
            )}
          </Grid>
        </Grid>
      )}
    </>
  );
}
