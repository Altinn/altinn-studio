import type { FormItem } from '../../../types/FormItem';
import type { FormItemProperty } from '../../../types/FormItemProperty';
import React from 'react';
import type { TranslationKey } from 'language/type';
import { Trans } from 'react-i18next';
import classes from './ExpressionHeading.module.css';

export type ExpressionHeadingProps = {
  formItem: FormItem;
  property: FormItemProperty;
};

export const ExpressionHeading = ({ formItem, property }: ExpressionHeadingProps) => (
  <Trans
    i18nKey={makeTextKeyFromProperty(property)}
    values={{ componentName: formItem.id }}
    components={{
      componentName: <span className={classes.componentName} />,
      textElement: <span className={classes.textElement} />,
    }}
  />
);

// Todo: https://github.com/Altinn/altinn-studio/issues/12382 will probably eliminate the need to cast the types here
const makeTextKeyFromProperty = (property: FormItemProperty): string => {
  switch (property.key) {
    case 'hidden' as string:
      return 'right_menu.expressions_property_preview_hidden';
    case 'required' as string:
      return 'right_menu.expressions_property_preview_required';
    case 'readOnly' as string:
      return 'right_menu.expressions_property_preview_read_only';
    case 'edit' as string:
      return makeTextKeyFromSubProperty(property.subKey as string);
    default:
      return undefined;
  }
};

const makeTextKeyFromSubProperty = (subKey: string): TranslationKey | undefined => {
  switch (subKey) {
    case 'addButton':
      return 'right_menu.expressions_group_property_preview_show_add_button';
    case 'alertOnDelete':
      return 'right_menu.expressions_group_property_preview_alert_on_delete';
    case 'deleteButton':
      return 'right_menu.expressions_group_property_preview_show_delete_button';
    case 'editButton':
      return 'right_menu.expressions_group_property_preview_show_edit_button';
    case 'saveAndNextButton':
      return 'right_menu.expressions_group_property_preview_show_save_and_next_button';
    case 'saveButton':
      return 'right_menu.expressions_group_property_preview_show_save_button';
    default:
      return undefined;
  }
};
