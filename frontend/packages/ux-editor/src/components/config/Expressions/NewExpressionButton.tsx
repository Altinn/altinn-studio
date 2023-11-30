import React, { useRef } from 'react';
import { Button, DropdownMenu } from '@digdir/design-system-react';
import { PlusIcon } from '@navikt/aksel-icons';
import { useText } from '../../../hooks';
import { ExpressionProperty, expressionPropertyTexts } from '../../../types/Expressions';

export interface NewExpressionButtonProps {
  options: ExpressionProperty[];
  onAddExpression: (property: ExpressionProperty) => void;
}

export const NewExpressionButton = ({ options, onAddExpression }: NewExpressionButtonProps) => {
  const [showDropDown, setShowDropDown] = React.useState<boolean>(false);
  const t = useText();
  const anchorEl = useRef(null);

  return (
    <>
      <Button
        title={t('right_menu.expressions_add')}
        color='first'
        fullWidth
        icon={<PlusIcon />}
        id='right_menu.dynamics_add'
        size='small'
        variant='secondary'
        ref={anchorEl}
        aria-haspopup='menu'
        aria-expanded={showDropDown}
        onClick={() => setShowDropDown(!showDropDown)}
      >
        {t('right_menu.expressions_add')}
      </Button>
      <DropdownMenu
        anchorEl={anchorEl.current}
        placement='bottom'
        size='medium'
        open={showDropDown}
      >
        <DropdownMenu.Group heading={t('right_menu.expressions_property')}>
          {options.map((o) => (
            <DropdownMenu.Item
              key={o}
              onClick={() => {
                setShowDropDown(false);
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
