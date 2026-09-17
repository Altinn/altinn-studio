import React from 'react';

import { CommonExpressions } from '@app/layout-contract/generated/expressions.generated';
import cn from 'classnames';

import { getComponentDef } from '..';

import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { hasValidationErrors } from 'src/features/validation/utils';
import { EditButton } from 'src/layout/Summary/EditButton';
import classes from 'src/layout/Summary/SummaryContent.module.css';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
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
  const config = useComponentConfig(targetBaseComponentId);
  const readOnly = useEvalExpression(
    'readOnly' in config ? config.readOnly : undefined,
    CommonExpressions.FormComponentProps.readOnly,
  );
  const summaryAccessibleTitle = useEvalExpression(
    config.textResourceBindings && 'summaryAccessibleTitle' in config.textResourceBindings
      ? config.textResourceBindings.summaryAccessibleTitle
      : undefined,
    CommonExpressions.TRBSummarizable.summaryAccessibleTitle,
  );
  const summaryTitle = useEvalExpression(
    config.textResourceBindings && 'summaryTitle' in config.textResourceBindings
      ? config.textResourceBindings.summaryTitle
      : undefined,
    CommonExpressions.TRBSummarizable.summaryTitle,
  );
  const title = useEvalExpression(
    config.textResourceBindings && 'title' in config.textResourceBindings
      ? config.textResourceBindings.title
      : undefined,
    CommonExpressions.TRBLabel.title,
  );

  const display = overrides?.display;
  const readOnlyComponent = 'readOnly' in config && readOnly === true;
  const validations = useUnifiedValidationsForNode(targetBaseComponentId);
  const hasErrors = hasValidationErrors(validations);
  const shouldShowChangeButton = !readOnlyComponent && !display?.hideChangeButton;
  const def = getComponentDef(config.type);
  const displaySummaryBoilerPlate = 'renderSummaryBoilerplate' in def && def.renderSummaryBoilerplate();

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
