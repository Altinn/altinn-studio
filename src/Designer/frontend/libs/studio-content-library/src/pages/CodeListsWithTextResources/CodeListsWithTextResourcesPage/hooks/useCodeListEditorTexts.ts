import { useTranslation } from 'react-i18next';
import type {
  CodeListEditorTexts,
  CodeListItemTextProperty,
  TextResourceInputTexts,
} from '@studio/components-legacy';

export function useCodeListEditorTexts(): CodeListEditorTexts {
  const { t } = useTranslation();
  const textResourceTexts = useTextResourceTexts();
  const typeSelectorOptions = useTypeSelectorOptions();

  return {
    add: t('code_list_editor.add_option'),
    codeList: t('code_list_editor.legend'),
    delete: t('code_list_editor.column_title_delete'),
    deleteItem: (number: number) => t('code_list_editor.delete_code_list_item', { number }),
    description: t('code_list_editor.column_title_description'),
    disabledAddButtonTooltip: t('code_list_editor.add_button_disabled'),
    emptyCodeList: t('code_list_editor.empty'),
    generalError: t('code_list_editor.general_error'),
    helpText: t('code_list_editor.column_title_help_text'),
    itemDescription: (number: number) => t('code_list_editor.description_item', { number }),
    itemHelpText: (number: number) => t('code_list_editor.help_text_item', { number }),
    itemLabel: (number: number) => t('code_list_editor.label_item', { number }),
    itemValue: (number: number) => t('code_list_editor.value_item', { number }),
    label: t('code_list_editor.column_title_label'),
    textResourceTexts,
    typeSelectorDescription: t('code_list_editor.type_selector_description'),
    typeSelectorLabel: t('code_list_editor.type_selector_label'),
    typeSelectorOptions,
    value: t('code_list_editor.column_title_value'),
    valueErrors: {
      duplicateValue: t('code_list_editor.error_duplicate_values'),
      multipleTypes: t('code_list_editor.error_multiple_types'),
      nullValue: t('code_list_editor.error_null_value'),
    },
  };
}

function useTextResourceTexts(): (
  number: number,
  property: CodeListItemTextProperty,
) => TextResourceInputTexts {
  const { t } = useTranslation();
  const prefix = 'code_list_editor.text_resource';
  return (number: number, property: CodeListItemTextProperty) => ({
    editValue: t(`${prefix}.${property}.edit_mode`, { number }),
    emptyTextResourceList: t(`${prefix}.empty_list`),
    idLabel: t(`${prefix}.id_label`),
    search: t(`${prefix}.${property}.search_mode`, { number }),
    textResourcePickerLabel: t(`${prefix}.${property}.select`, { number }),
    noTextResourceOptionLabel: t(`${prefix}.no_text_resource_option_label`),
    valueLabel: t(`${prefix}.${property}.value`, { number }),
  });
}

function useTypeSelectorOptions(): CodeListEditorTexts['typeSelectorOptions'] {
  const { t } = useTranslation();
  return {
    string: t('code_list_editor.type_selector_option_string'),
    number: t('code_list_editor.type_selector_option_number'),
    boolean: t('code_list_editor.type_selector_option_boolean'),
  };
}
