import React, { useRef } from 'react';
import { Button, DropdownMenu } from '@digdir/design-system-react';
import { PlusIcon } from '@navikt/aksel-icons';
import { useText } from '../../../hooks';
import { ExpressionProperty } from '../../../types/Expressions';

export interface NewExpressionButtonProps {
  options: { label: string; value: string }[];
  onAddExpression: (property: ExpressionProperty) => void;
}

// TODO: Replace with new dropDown component from DesignSystem
export const NewExpressionButton = (props: NewExpressionButtonProps) => {
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
        onClick={() => setShowDropDown(true)}
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
          {props.options.map((o) => (
            <DropdownMenu.Item
              key={o.label}
              onClick={() => {
                setShowDropDown(false);
                props.onAddExpression(o.value as ExpressionProperty);
              }}
            >
              {o.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Group>
      </DropdownMenu>
    </>
  );
};
