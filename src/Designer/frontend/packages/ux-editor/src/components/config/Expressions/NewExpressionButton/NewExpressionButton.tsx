import React from 'react';
import { PlusIcon } from 'libs/studio-icons/src';
import { useText } from '../../../../hooks';
import { StudioDropdownMenu } from 'libs/studio-components-legacy/src';
import { useFormItemContext } from '../../../../containers/FormItemContext';
import { addExpressionToFormItem, getUndefinedExpressionProperties } from '../utils';
import type { FormItemProperty } from '../../../../types/FormItemProperty';
import { useTranslation } from 'react-i18next';

export const NewExpressionButton = () => {
  const t = useText();
  const { formItem } = useFormItemContext();

  const remainingProperties = getUndefinedExpressionProperties(formItem);
  const areThereRemainingProperties = remainingProperties.length > 0;

  const title = areThereRemainingProperties
    ? t('right_menu.expressions_add')
    : t('right_menu.expressions_expressions_limit_reached_alert');

  return (
    <StudioDropdownMenu
      anchorButtonProps={{
        children: t('right_menu.expressions_add'),
        color: 'first',
        disabled: !areThereRemainingProperties,
        icon: <PlusIcon />,
        title,
        variant: 'secondary',
      }}
      size='small'
    >
      {remainingProperties.map((property) => (
        <MenuItem property={property} key={JSON.stringify(property)} />
      ))}
    </StudioDropdownMenu>
  );
};

const MenuItem = ({ property }: { property: FormItemProperty }) => {
  const { formItem, handleUpdate, debounceSave } = useFormItemContext();
  const text = useAddExpressionText(property);

  const handleAddExpression = async () => {
    const newFormItem = addExpressionToFormItem(formItem, property);
    handleUpdate(newFormItem);
    await debounceSave(); // Todo: handleSave does not work here. Will probably be fixed by https://github.com/Altinn/altinn-studio/issues/12383.
  };

  return <StudioDropdownMenu.Item onClick={handleAddExpression}>{text}</StudioDropdownMenu.Item>;
};

const useAddExpressionText = (property: FormItemProperty) => {
  const { t } = useTranslation();
  return t(getAddPropertyTextKey(property));
};

// Todo: https://github.com/Altinn/altinn-studio/issues/12382 will probably eliminate the need to cast the types here
const getAddPropertyTextKey = (property: FormItemProperty): string => {
  switch (property.key) {
    case 'hidden' as string:
      return 'right_menu.expressions_property_hidden';
    case 'required' as string:
      return 'right_menu.expressions_property_required';
    case 'readOnly' as string:
      return 'right_menu.expressions_property_read_only';
    case 'edit' as string:
      return getAddSubPropertyTextKey(property.subKey as string);
    default:
      return undefined;
  }
};

const getAddSubPropertyTextKey = (subKey: string): string => {
  switch (subKey) {
    case 'addButton':
      return 'right_menu.expressions_group_property_show_add_button';
    case 'alertOnDelete':
      return 'right_menu.expressions_group_property_alert_on_delete';
    case 'deleteButton':
      return 'right_menu.expressions_group_property_show_delete_button';
    case 'editButton':
      return 'right_menu.expressions_group_property_show_edit_button';
    case 'saveAndNextButton':
      return 'right_menu.expressions_group_property_show_save_and_next_button';
    case 'saveButton':
      return 'right_menu.expressions_group_property_show_save_button';
    default:
      return undefined;
  }
};
