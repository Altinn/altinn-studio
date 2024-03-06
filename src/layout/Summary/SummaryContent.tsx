import React from 'react';

import cn from 'classnames';

import { FD } from 'src/features/formData/FormDataWrite';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { hasValidationErrors } from 'src/features/validation/utils';
import { EditButton } from 'src/layout/Summary/EditButton';
import classes from 'src/layout/Summary/SummaryContent.module.css';
import type { CompTypes } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

interface SummaryContentProps extends Omit<SummaryRendererProps<CompTypes>, 'formDataSelector'> {
  RenderSummary: React.ElementType<SummaryRendererProps<CompTypes>>;
}

export function SummaryContent({
  onChangeClick,
  changeText,
  summaryNode,
  targetNode,
  overrides,
  RenderSummary,
}: SummaryContentProps) {
  const { langAsString } = useLanguage(targetNode);
  const display = overrides?.display || summaryNode.item.display;
  const readOnlyComponent = 'readOnly' in targetNode.item && targetNode.item.readOnly === true;
  const validations = useUnifiedValidationsForNode(targetNode);
  const hasErrors = hasValidationErrors(validations);
  const shouldShowChangeButton = !readOnlyComponent && !display?.hideChangeButton;
  const displaySummaryBoilerPlate =
    'renderSummaryBoilerplate' in targetNode.def && targetNode.def.renderSummaryBoilerplate();

  const textBindings = 'textResourceBindings' in targetNode.item ? targetNode.item.textResourceBindings : undefined;
  const summaryAccessibleTitleTrb =
    textBindings && 'summaryAccessibleTitle' in textBindings ? textBindings.summaryAccessibleTitle : undefined;
  const summaryTitleTrb = textBindings && 'summaryTitle' in textBindings ? textBindings.summaryTitle : undefined;
  const titleTrb = textBindings && 'title' in textBindings ? textBindings.title : undefined;
  const formDataSelector = FD.useDebouncedSelector();

  return (
    <div className={classes.container}>
      {displaySummaryBoilerPlate && (
        <span
          className={cn(classes.label, hasErrors && !display?.hideValidationMessages && classes.labelError)}
          {...(hasErrors && {
            'data-testid': 'has-validation-message',
          })}
        >
          <Lang
            id={summaryTitleTrb ?? titleTrb}
            node={targetNode}
          />
        </span>
      )}
      <span className={classes.summary}>
        <RenderSummary
          onChangeClick={onChangeClick}
          changeText={changeText}
          summaryNode={summaryNode}
          targetNode={targetNode}
          overrides={overrides}
          formDataSelector={formDataSelector}
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
