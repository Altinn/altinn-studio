import React, { useCallback } from 'react';

import { ErrorPaper } from 'src/components/message/ErrorPaper';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useDeepValidationsForNode } from 'src/features/validation/selectors/deepValidationsForNode';
import { hasValidationErrors } from 'src/features/validation/utils';
import { CompCategory } from 'src/layout/common';
import { GroupComponent } from 'src/layout/Group/GroupComponent';
import classes from 'src/layout/Group/SummaryGroupComponent.module.css';
import { EditButton } from 'src/layout/Summary/EditButton';
import { SummaryComponentFor } from 'src/layout/Summary/SummaryComponent';
import { Hidden } from 'src/utils/layout/NodesContext';
import { useNodeDirectChildren, useNodeItem } from 'src/utils/layout/useNodeItem';
import type { CompTypes, ITextResourceBindings } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function SummaryGroupComponent({
  onChangeClick,
  changeText,
  targetNode,
  overrides,
}: SummaryRendererProps<'Group'>) {
  const targetItem = useNodeItem(targetNode);
  const excludedChildren = overrides?.excludedChildren;
  const display = overrides?.display;
  const { langAsString } = useLanguage();
  const isHidden = Hidden.useIsHiddenSelector();

  const inExcludedChildren = useCallback(
    (n: LayoutNode) =>
      excludedChildren ? excludedChildren.includes(n.id) || excludedChildren.includes(n.baseId) : false,
    [excludedChildren],
  );

  const groupValidations = useDeepValidationsForNode(targetNode);
  const groupHasErrors = hasValidationErrors(groupValidations);

  const textBindings = targetItem.textResourceBindings as ITextResourceBindings;
  const summaryAccessibleTitleTrb =
    textBindings && 'summaryAccessibleTitle' in textBindings ? textBindings.summaryAccessibleTitle : undefined;
  const summaryTitleTrb = textBindings && 'summaryTitle' in textBindings ? textBindings.summaryTitle : undefined;
  const titleTrb = textBindings && 'title' in textBindings ? textBindings.title : undefined;
  const ariaLabel = langAsString(summaryAccessibleTitleTrb ?? summaryTitleTrb ?? titleTrb);
  const children = useNodeDirectChildren(targetNode).filter((n) => !inExcludedChildren(n));

  const largeGroup = overrides?.largeGroup ?? false;
  if (largeGroup) {
    return (
      <GroupComponent
        key={`summary-${targetNode.id}`}
        id={`summary-${targetNode.id}`}
        groupNode={targetNode}
        isSummary={true}
        renderLayoutNode={(node) => (
          <SummaryComponentFromNode
            key={node.id}
            targetNode={node}
            overrides={overrides}
            inExcludedChildren={inExcludedChildren}
          />
        )}
      />
    );
  }

  const childSummaryComponents = children.map((child) => {
    if (!child.isCategory(CompCategory.Form) || isHidden(child)) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const RenderCompactSummary = child.def.renderCompactSummary.bind(child.def) as React.FC<SummaryRendererProps<any>>;
    return (
      <RenderCompactSummary
        onChangeClick={onChangeClick}
        changeText={changeText}
        key={child.id}
        targetNode={child}
        overrides={{}}
      />
    );
  });

  return (
    <>
      <div
        data-testid='summary-group-component'
        style={{ width: '100%' }}
      >
        <div className={classes.container}>
          <span className={classes.label}>
            <Lang id={summaryTitleTrb ?? titleTrb} />
          </span>

          {!display?.hideChangeButton && (
            <EditButton
              onClick={onChangeClick}
              editText={changeText}
              label={ariaLabel}
            />
          )}
        </div>
        <div style={{ width: '100%' }}>
          <div className={classes.border}>{childSummaryComponents}</div>
        </div>
      </div>

      {groupHasErrors && !display?.hideValidationMessages && (
        <div className={classes.gridStyle}>
          <ErrorPaper message={langAsString('group.row_error')} />
          <div>
            {!display?.hideChangeButton && (
              <button
                className={classes.link}
                onClick={onChangeClick}
                type='button'
              >
                <Lang id='form_filler.summary_go_to_correct_page' />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

interface SummaryComponentFromRefProps extends Pick<SummaryRendererProps<CompTypes>, 'targetNode' | 'overrides'> {
  inExcludedChildren: (node: LayoutNode) => boolean;
}

function SummaryComponentFromNode({ targetNode, inExcludedChildren, overrides }: SummaryComponentFromRefProps) {
  const isHidden = Hidden.useIsHidden(targetNode);
  if (inExcludedChildren(targetNode) || isHidden) {
    return null;
  }

  return (
    <SummaryComponentFor
      targetNode={targetNode}
      overrides={{
        ...overrides,
        grid: {},
        largeGroup: true,
      }}
    />
  );
}
