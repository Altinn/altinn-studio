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
import { useEvalExpression, useEvalOptionalTrb } from 'src/utils/layout/useEvalExpression';
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
  const summaryAccessibleTitle = useEvalOptionalTrb(
    config,
    'summaryAccessibleTitle',
    CommonExpressions.TRBSummarizable,
  );
  const summaryTitle = useEvalOptionalTrb(config, 'summaryTitle', CommonExpressions.TRBSummarizable);
  const title = useEvalOptionalTrb(config, 'title', CommonExpressions.TRBLabel);

  const display = overrides?.display;
  const readOnlyComponent = 'readOnly' in config && readOnly === true;
  const validations = useUnifiedValidationsForNode(targetBaseComponentId);
  const hasErrors = hasValidationErrors(validations);
  const shouldShowChangeButton = !readOnlyComponent && !display?.hideChangeButton;
  const def = getComponentDef(config.type);
  const displaySummaryBoilerPlate = 'renderSummaryBoilerplate' in def && def.renderSummaryBoilerplate();

  return (
    <div className={classes.container}>
      {displaySummaryBoilerPlate && (
        <span
          className={cn(classes.label, hasErrors && !display?.hideValidationMessages && classes.labelError)}
          {...(hasErrors && {
            'data-testid': 'has-validation-message',
          })}
        >
          <Lang id={summaryTitle ?? title} />
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
            label={langAsString(summaryAccessibleTitle ?? summaryTitle ?? title)}
          />
        </span>
      )}
    </div>
  );
}
