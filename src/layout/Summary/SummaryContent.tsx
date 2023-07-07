import React from 'react';

import cn from 'classnames';

import { useLanguage } from 'src/hooks/useLanguage';
import { EditButton } from 'src/layout/Summary/EditButton';
import classes from 'src/layout/Summary/SummaryContent.module.css';
import type { ITextResourceBindings } from 'src/layout/layout';
import type { ISummaryComponent } from 'src/layout/Summary/SummaryComponent';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
export interface SummaryContentProps {
  onChangeClick: () => void;
  changeText: string | null;
  summaryNode: LayoutNodeFromType<'Summary'>;
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
  const { lang, langAsString } = useLanguage();
  const display = overrides?.display || summaryNode.item.display;
  const readOnlyComponent = targetNode.item.readOnly === true;
  const hasValidationMessages = targetNode.hasValidationMessages();
  const shouldShowChangeButton = !readOnlyComponent && !display?.hideChangeButton;
  const displaySummaryBoilerPlate =
    'renderSummaryBoilerplate' in targetNode.def && targetNode.def.renderSummaryBoilerplate();

  const textBindings = targetNode.item.textResourceBindings as ITextResourceBindings;
  const title = lang(textBindings?.summaryTitle ?? textBindings?.title);
  const ariaLabel = langAsString(
    textBindings?.summaryAccessibleTitle ?? textBindings?.summaryTitle ?? textBindings?.title,
  );

  return (
    <div className={classes.container}>
      {displaySummaryBoilerPlate && (
        <span
          className={cn(classes.label, hasValidationMessages && !display?.hideValidationMessages && classes.labelError)}
          {...(hasValidationMessages && {
            'data-testid': 'has-validation-message',
          })}
        >
          {title}
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
            label={ariaLabel}
          />
        </span>
      )}
    </div>
  );
}
