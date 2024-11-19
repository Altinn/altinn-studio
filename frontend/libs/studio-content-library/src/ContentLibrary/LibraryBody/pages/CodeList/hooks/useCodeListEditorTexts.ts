import { useTranslation } from 'react-i18next';
import type { CodeListEditorTexts } from '@studio/components';

export const useOptionListEditorTexts = (): CodeListEditorTexts => {
  const { t } = useTranslation();

  return {
    add: t('code_list_editor.add_option'),
    delete: t('code_list_editor.column_title_delete'),
    value: t('code_list_editor.column_title_value'),
    label: t('code_list_editor.column_title_label'),
    description: t('code_list_editor.column_title_description'),
    helpText: t('code_list_editor.column_title_help_text'),
    deleteItem: (number: number) => t('code_list_editor.delete_code_list_item', { number }),
    itemValue: (number: number) => t('code_list_editor.value_item', { number }),
    itemLabel: (number: number) => t('code_list_editor.label_item', { number }),
    itemDescription: (number: number) => t('code_list_editor.description_item', { number }),
    itemHelpText: (number: number) => t('code_list_editor.help_text_item', { number }),
    codeList: t('code_list_editor.legend'),
    emptyCodeList: t('code_list_editor.empty'),
    valueErrors: {
      duplicateValue: t('code_list_editor.duplicate_values_error'),
    },
    generalError: t('code_list_editor.general_error'),
  };
};
