import React from 'react';
import { PlusIcon } from '@studio/icons';
import { useText } from '../../../hooks';
import type { ExpressionProperty } from '../../../types/Expressions';
import { expressionPropertyTexts } from '../../../types/Expressions';
import { StudioDropdown } from '@studio/components';

export interface NewExpressionButtonProps {
  options: ExpressionProperty[];
  onAddExpression: (property: ExpressionProperty) => void;
}

export const NewExpressionButton = ({ options, onAddExpression }: NewExpressionButtonProps) => {
  const t = useText();

  return (
    <StudioDropdown
      placement='top'
      icon={<PlusIcon />}
      triggerButtonVariant='secondary'
      triggerButtonText={t('right_menu.expressions_add')}
    >
      <StudioDropdown.List>
        {options.map((o) => (
          <StudioDropdown.Item
            key={o}
            onClick={() => {
              onAddExpression(o);
            }}
          >
            <StudioDropdown.Button>{expressionPropertyTexts(t)[o]}</StudioDropdown.Button>
          </StudioDropdown.Item>
        ))}
      </StudioDropdown.List>
    </StudioDropdown>
  );
};
