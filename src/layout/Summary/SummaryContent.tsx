import React from 'react';

import cn from 'classnames';

import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { EditButton } from 'src/layout/Summary/EditButton';
import classes from 'src/layout/Summary/SummaryContent.module.css';
import type { ISummaryComponent } from 'src/layout/Summary/SummaryComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface SummaryContentProps {
  onChangeClick: () => void;
  changeText: string | null;
  summaryNode: LayoutNode<'Summary'>;
  targetNode: LayoutNode;
  overrides: ISummaryComponent['overrides'];
  RenderSummary: React.ElementType;
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
  const hasValidationMessages = targetNode.hasValidationMessages();
  const shouldShowChangeButton = !readOnlyComponent && !display?.hideChangeButton;
  const displaySummaryBoilerPlate =
    'renderSummaryBoilerplate' in targetNode.def && targetNode.def.renderSummaryBoilerplate();

  const textBindings = 'textResourceBindings' in targetNode.item ? targetNode.item.textResourceBindings : undefined;
  const summaryAccessibleTitleTrb =
    textBindings && 'summaryAccessibleTitle' in textBindings ? textBindings.summaryAccessibleTitle : undefined;
  const summaryTitleTrb = textBindings && 'summaryTitle' in textBindings ? textBindings.summaryTitle : undefined;
  const titleTrb = textBindings && 'title' in textBindings ? textBindings.title : undefined;

  return (
    <div className={classes.container}>
      {displaySummaryBoilerPlate && (
        <span
          className={cn(classes.label, hasValidationMessages && !display?.hideValidationMessages && classes.labelError)}
          {...(hasValidationMessages && {
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
