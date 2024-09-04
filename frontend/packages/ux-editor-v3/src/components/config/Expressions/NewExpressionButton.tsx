import React from 'react';
import { DropdownMenu } from '@digdir/designsystemet-react';
import { PlusIcon } from '@studio/icons';
import { useText } from '../../../hooks';
import type { ExpressionProperty } from '../../../types/Expressions';
import { expressionPropertyTexts } from '../../../types/Expressions';
import { StudioButton } from '@studio/components';

export interface NewExpressionButtonProps {
  options: ExpressionProperty[];
  onAddExpression: (property: ExpressionProperty) => void;
}

export const NewExpressionButton = ({ options, onAddExpression }: NewExpressionButtonProps) => {
  const [showDropdown, setShowDropdown] = React.useState<boolean>(false);
  const t = useText();

  return (
    <DropdownMenu
      onClose={() => setShowDropdown(false)}
      open={showDropdown}
      placement='top'
      portal
      size='small'
    >
      <DropdownMenu.Trigger asChild>
        <StudioButton
          aria-expanded={showDropdown}
          aria-haspopup='menu'
          color='first'
          fullWidth
          icon={<PlusIcon />}
          onClick={() => setShowDropdown(!showDropdown)}
          title={t('right_menu.expressions_add')}
          variant='secondary'
        >
          {t('right_menu.expressions_add')}
        </StudioButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Group heading={t('right_menu.expressions_property')}>
          {options.map((o) => (
            <DropdownMenu.Item
              key={o}
              onClick={() => {
                setShowDropdown(false);
                onAddExpression(o);
              }}
            >
              {expressionPropertyTexts(t)[o]}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Group>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};
