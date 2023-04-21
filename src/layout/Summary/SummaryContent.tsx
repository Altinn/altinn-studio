import React from 'react';

import cn from 'classnames';

import { EditButton } from 'src/layout/Summary/EditButton';
import classes from 'src/layout/Summary/SummaryContent.module.css';
import { getPlainTextFromNode } from 'src/utils/stringHelper';
import type { ISummaryComponent } from 'src/layout/Summary/SummaryComponent';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface SummaryContentProps {
  onChangeClick: () => void;
  changeText: string | null;
  label: React.ReactNode;
  summaryNode: LayoutNodeFromType<'Summary'>;
  targetNode: LayoutNode;
  overrides: ISummaryComponent['overrides'];
  RenderSummary: React.ElementType;
}

export function SummaryContent({
  onChangeClick,
  changeText,
  label,
  summaryNode,
  targetNode,
  overrides,
  RenderSummary,
}: SummaryContentProps) {
  const display = overrides?.display || summaryNode.item.display;
  const readOnlyComponent = targetNode.item.readOnly === true;
  const hasValidationMessages = targetNode.hasValidationMessages();
  const shouldShowChangeButton = !readOnlyComponent && !display?.hideChangeButton;
  const displaySummaryBoilerPlate =
    'renderSummaryBoilerplate' in targetNode.def && targetNode.def.renderSummaryBoilerplate();

  return (
    <div className={classes.container}>
      {displaySummaryBoilerPlate && (
        <span
          className={cn(classes.label, hasValidationMessages && !display?.hideValidationMessages && classes.labelError)}
          {...(hasValidationMessages && {
            'data-testid': 'has-validation-message',
          })}
        >
          {label}
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
            label={getPlainTextFromNode(label)}
          />
        </span>
      )}
    </div>
  );
}
