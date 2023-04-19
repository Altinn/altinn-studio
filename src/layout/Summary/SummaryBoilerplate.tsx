import React from 'react';

import cn from 'classnames';

import { EditButton } from 'src/layout/Summary/EditButton';
import classes from 'src/layout/Summary/SummaryBoilerplate.module.css';
import { getPlainTextFromNode } from 'src/utils/stringHelper';
import type { ISummaryComponent } from 'src/layout/Summary/SummaryComponent';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface SummaryBoilerplateProps {
  onChangeClick: () => void;
  changeText: string | null;
  label: React.ReactNode;
  summaryNode: LayoutNodeFromType<'Summary'>;
  targetNode: LayoutNode;
  overrides: ISummaryComponent['overrides'];
}

export function SummaryBoilerplate({
  onChangeClick,
  changeText,
  label,
  summaryNode,
  targetNode,
  overrides,
}: SummaryBoilerplateProps) {
  const display = overrides?.display || summaryNode.item.display;
  const readOnlyComponent = targetNode.item.readOnly === true;
  const hasValidationMessages = targetNode.hasValidationMessages();
  const shouldShowChangeButton = !readOnlyComponent && !display?.hideChangeButton;

  return (
    <div className={classes.container}>
      <span
        className={cn(classes.label, hasValidationMessages && !display?.hideValidationMessages && classes.labelError)}
        {...(hasValidationMessages && {
          'data-testid': 'has-validation-message',
        })}
      >
        {label}
      </span>
      {shouldShowChangeButton && (
        <EditButton
          onClick={onChangeClick}
          editText={changeText}
          label={getPlainTextFromNode(label)}
        />
      )}
    </div>
  );
}
