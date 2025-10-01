import React from 'react';

import cn from 'classnames';

import { getComponentDef } from '..';

import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { hasValidationErrors } from 'src/features/validation/utils';
import { EditButton } from 'src/layout/Summary/EditButton';
import classes from 'src/layout/Summary/SummaryContent.module.css';
import { useItemFor } from 'src/utils/layout/useNodeItem';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

interface SummaryContentProps extends SummaryRendererProps {
  RenderSummary: React.ElementType<SummaryRendererProps>;
}

export function SummaryContent({
  onChangeClick,
  changeText,
  targetBaseComponentId,
  overrides,
  RenderSummary,
}: SummaryContentProps) {
  const { langAsString } = useLanguage();
  const targetItem = useItemFor(targetBaseComponentId);
  const display = overrides?.display;
  const readOnlyComponent = 'readOnly' in targetItem && targetItem.readOnly === true;
  const validations = useUnifiedValidationsForNode(targetBaseComponentId);
  const hasErrors = hasValidationErrors(validations);
  const shouldShowChangeButton = !readOnlyComponent && !display?.hideChangeButton;
  const def = getComponentDef(targetItem.type);
  const displaySummaryBoilerPlate = 'renderSummaryBoilerplate' in def && def.renderSummaryBoilerplate();

  const textBindings = 'textResourceBindings' in targetItem ? targetItem.textResourceBindings : undefined;
  const summaryAccessibleTitleTrb =
    textBindings && 'summaryAccessibleTitle' in textBindings
      ? (textBindings.summaryAccessibleTitle as string)
      : undefined;
  const summaryTitleTrb =
    textBindings && 'summaryTitle' in textBindings ? (textBindings.summaryTitle as string) : undefined;
  const titleTrb = textBindings && 'title' in textBindings ? textBindings.title : undefined;

  return (
    <div className={classes.container}>
      {displaySummaryBoilerPlate && (
        <span
          className={cn(classes.label, hasErrors && !display?.hideValidationMessages && classes.labelError)}
          {...(hasErrors && {
            'data-testid': 'has-validation-message',
          })}
        >
          <Lang id={summaryTitleTrb ?? titleTrb} />
        </span>
      )}
      <span className={classes.summary}>
        <RenderSummary
          onChangeClick={onChangeClick}
          changeText={changeText}
          targetBaseComponentId={targetBaseComponentId}
          overrides={overrides}
        />
      </span>
      {displaySummaryBoilerPlate && shouldShowChangeButton && (
        <span className={classes.editBtn}>
          <EditButton
            onClick={onChangeClick}
            editText={changeText}
            label={langAsString(summaryAccessibleTitleTrb ?? summaryTitleTrb ?? titleTrb)}
          />
        </span>
      )}
    </div>
  );
}
