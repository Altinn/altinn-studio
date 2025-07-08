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
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { Hidden, useNode } from 'src/utils/layout/NodesContext';
import { useItemWhenType, useNodeDirectChildren } from 'src/utils/layout/useNodeItem';
import type { ITextResourceBindings } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function SummaryGroupComponent({
  onChangeClick,
  changeText,
  targetBaseComponentId,
  overrides,
}: SummaryRendererProps) {
  const targetItem = useItemWhenType(targetBaseComponentId, 'Group');
  const excludedChildren = overrides?.excludedChildren;
  const display = overrides?.display;
  const { langAsString } = useLanguage();
  const isHidden = Hidden.useIsHiddenSelector();

  const inExcludedChildren = useCallback(
    (n: LayoutNode) =>
      excludedChildren ? excludedChildren.includes(n.id) || excludedChildren.includes(n.baseId) : false,
    [excludedChildren],
  );

  const groupValidations = useDeepValidationsForNode(targetBaseComponentId);
  const groupHasErrors = hasValidationErrors(groupValidations);

  const textBindings = targetItem.textResourceBindings as ITextResourceBindings;
  const summaryAccessibleTitleTrb =
    textBindings && 'summaryAccessibleTitle' in textBindings ? textBindings.summaryAccessibleTitle : undefined;
  const summaryTitleTrb = textBindings && 'summaryTitle' in textBindings ? textBindings.summaryTitle : undefined;
  const titleTrb = textBindings && 'title' in textBindings ? textBindings.title : undefined;
  const ariaLabel = langAsString(summaryAccessibleTitleTrb ?? summaryTitleTrb ?? titleTrb);
  const targetNode = useNode(useIndexedId(targetBaseComponentId));
  const children = useNodeDirectChildren(targetNode).filter((n) => !inExcludedChildren(n));

  const largeGroup = overrides?.largeGroup ?? false;
  if (largeGroup) {
    return (
      <GroupComponent
        key={`summary-${targetItem.id}`}
        id={`summary-${targetItem.id}`}
        baseComponentId={targetBaseComponentId}
        isSummary={true}
        renderLayoutNode={(node) => (
          <SummaryComponentFromNode
            key={node.id}
            targetBaseComponentId={node.baseId}
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
    const RenderCompactSummary = child.def.renderCompactSummary.bind(child.def) as React.FC<SummaryRendererProps>;
    return (
      <RenderCompactSummary
        onChangeClick={onChangeClick}
        changeText={changeText}
        key={child.id}
        targetBaseComponentId={child.baseId}
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

interface SummaryComponentFromRefProps extends Pick<SummaryRendererProps, 'targetBaseComponentId' | 'overrides'> {
  inExcludedChildren: (node: LayoutNode) => boolean;
}

function SummaryComponentFromNode({
  targetBaseComponentId,
  inExcludedChildren,
  overrides,
}: SummaryComponentFromRefProps) {
  const node = useNode(useIndexedId(targetBaseComponentId));
  const isHidden = Hidden.useIsHidden(node);
  if (inExcludedChildren(node) || isHidden) {
    return null;
  }

  return (
    <SummaryComponentFor
      targetBaseComponentId={targetBaseComponentId}
      overrides={{
        ...overrides,
        grid: {},
        largeGroup: true,
      }}
    />
  );
}
