import React, { useRef } from 'react';
import { DropdownMenu } from '@digdir/design-system-react';
import { PlusIcon } from '@navikt/aksel-icons';
import { useText } from '../../../hooks';
import type { ExpressionProperty } from '../../../types/Expressions';
import { expressionPropertyTexts } from '../../../types/Expressions';
import { StudioButton } from '@studio/components';

import classes from './NewExpressionButton.module.css';

export interface NewExpressionButtonProps {
  options: ExpressionProperty[];
  onAddExpression: (property: ExpressionProperty) => void;
}

export const NewExpressionButton = ({ options, onAddExpression }: NewExpressionButtonProps) => {
  const [showDropdown, setShowDropdown] = React.useState<boolean>(false);
  const t = useText();
  const anchorEl = useRef(null);

  return (
    <>
      <StudioButton
        aria-expanded={showDropdown}
        aria-haspopup='menu'
        color='first'
        fullWidth
        icon={<PlusIcon />}
        onClick={() => setShowDropdown(!showDropdown)}
        ref={anchorEl}
        size='small'
        title={t('right_menu.expressions_add')}
        variant='secondary'
      >
        {t('right_menu.expressions_add')}
      </StudioButton>
      <DropdownMenu
        anchorEl={anchorEl.current}
        className={classes.dropdownMenu}
        onClose={() => setShowDropdown(false)}
        open={showDropdown}
        placement='top'
        portal
        size='small'
      >
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
      </DropdownMenu>
    </>
  );
};
