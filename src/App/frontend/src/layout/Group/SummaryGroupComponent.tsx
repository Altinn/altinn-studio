import React, { useCallback } from 'react';

import { CompCategory } from '@app/layout-contract';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { ErrorPaper } from 'src/components/message/ErrorPaper';
import { FormStore } from 'src/features/form/FormContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useDeepValidationsForNode } from 'src/features/validation/selectors/deepValidationsForNode';
import { hasValidationErrors } from 'src/features/validation/utils';
import { getComponentDef } from 'src/layout';
import { GroupComponent } from 'src/layout/Group/GroupComponent';
import classes from 'src/layout/Group/SummaryGroupComponent.module.css';
import { EditButton } from 'src/layout/Summary/EditButton';
import { SummaryComponentFor } from 'src/layout/Summary/SummaryComponent';
import { useComponentIdMutator, useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useIsHidden, useIsHiddenMulti } from 'src/utils/layout/hidden';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

export function SummaryGroupComponent({
  onChangeClick,
  changeText,
  targetBaseComponentId,
  overrides,
}: SummaryRendererProps) {
  const config = useComponentConfig(targetBaseComponentId, 'Group');
  const componentId = useIndexedId(targetBaseComponentId);
  const summaryAccessibleTitle = useEvalExpression(
    config.textResourceBindings?.summaryAccessibleTitle,
    Expressions.Group.textResourceBindings.summaryAccessibleTitle,
  );
  const summaryTitle = useEvalExpression(
    config.textResourceBindings?.summaryTitle,
    Expressions.Group.textResourceBindings.summaryTitle,
  );
  const title = useEvalExpression(config.textResourceBindings?.title, Expressions.Group.textResourceBindings.title);

  const excludedChildren = overrides?.excludedChildren;
  const display = overrides?.display;
  const { langAsString } = useLanguage();

  const idMutator = useComponentIdMutator();
  const inExcludedChildren = useCallback(
    (id: string) =>
      excludedChildren ? excludedChildren.includes(idMutator(id)) || excludedChildren.includes(id) : false,
    [excludedChildren, idMutator],
  );

  const groupValidations = useDeepValidationsForNode(targetBaseComponentId);
  const groupHasErrors = hasValidationErrors(groupValidations);

  const summaryAccessibleTitleTrb =
    config.textResourceBindings &&
    'summaryAccessibleTitle' in config.textResourceBindings &&
    config.textResourceBindings.summaryAccessibleTitle !== undefined
      ? summaryAccessibleTitle
      : undefined;
  const summaryTitleTrb =
    config.textResourceBindings &&
    'summaryTitle' in config.textResourceBindings &&
    config.textResourceBindings.summaryTitle !== undefined
      ? summaryTitle
      : undefined;
  const titleTrb =
    config.textResourceBindings &&
    'title' in config.textResourceBindings &&
    config.textResourceBindings.title !== undefined
      ? title
      : undefined;
  const ariaLabel = langAsString(summaryAccessibleTitleTrb ?? summaryTitleTrb ?? titleTrb);
  const isHidden = useIsHiddenMulti(config.children);
  const children = config.children.filter((id) => !inExcludedChildren(id) && !isHidden[id]);
  const layoutLookups = FormStore.bootstrap.useLayoutLookups();

  const largeGroup = overrides?.largeGroup ?? false;
  if (largeGroup) {
    return (
      <GroupComponent
        key={`summary-${componentId}`}
        id={`summary-${componentId}`}
        baseComponentId={targetBaseComponentId}
        isSummary={true}
        renderLayoutComponent={(id) => (
          <SummaryComponentFromNode
            key={id}
            targetBaseComponentId={id}
            overrides={overrides}
            inExcludedChildren={inExcludedChildren}
          />
        )}
      />
    );
  }

  const childSummaryComponents = children.map((child) => {
    const childLayout = layoutLookups.getComponent(child);
    const def = getComponentDef(childLayout.type);
    if (def.category !== CompCategory.Form) {
      return;
    }
    const RenderCompactSummary = def.renderCompactSummary.bind(def) as React.FC<SummaryRendererProps>;
    return (
      <RenderCompactSummary
        onChangeClick={onChangeClick}
        changeText={changeText}
        key={child}
        targetBaseComponentId={child}
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
  inExcludedChildren: (baseId: string) => boolean;
}

function SummaryComponentFromNode({
  targetBaseComponentId,
  inExcludedChildren,
  overrides,
}: SummaryComponentFromRefProps) {
  const isHidden = useIsHidden(targetBaseComponentId);
  if (inExcludedChildren(targetBaseComponentId) || isHidden) {
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
