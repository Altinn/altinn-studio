import React from 'react';
import { Button, Select } from '@digdir/design-system-react';
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

  const handleOnChange = (property: ExpressionProperty) => {
    props.onAddExpression(property);
    setShowDropDown(false);
  };

  return (
    <>
      {showDropDown ? (
        <Select
          label={t('right_menu.expressions_property')}
          hideLabel={true}
          onChange={(property) => handleOnChange(property)}
          options={props.options}
          value={'default'}
        />
      ) : (
        <Button
          title={t('right_menu.expressions_add')}
          color='first'
          fullWidth
          icon={<PlusIcon />}
          id='right_menu.dynamics_add'
          onClick={() => setShowDropDown(true)}
          size='small'
          variant='secondary'
        >
          {t('right_menu.expressions_add')}
        </Button>
      )}
    </>
  );
};
