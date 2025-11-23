import { useTranslation } from 'react-i18next';
import type { CodeListEditorTexts } from '@studio/components';

export function useCodeListEditorTexts(): CodeListEditorTexts {
  const { t } = useTranslation();

  return {
    add: t('code_list_editor.add_option'),
    codeList: t('code_list_editor.legend'),
    delete: t('code_list_editor.column_title_delete'),
    deleteItem: (number: number) => t('code_list_editor.delete_code_list_item', { number }),
    description: t('code_list_editor.column_title_description'),
    emptyCodeList: t('code_list_editor.empty'),
    generalError: t('code_list_editor.general_error'),
    helpText: t('code_list_editor.column_title_help_text'),
    itemDescription: (number: number) => t('code_list_editor.description_item', { number }),
    itemHelpText: (number: number) => t('code_list_editor.help_text_item', { number }),
    itemLabel: (number: number) => t('code_list_editor.label_item', { number }),
    itemValue: (number: number) => t('code_list_editor.value_item', { number }),
    label: t('code_list_editor.column_title_label'),
    value: t('code_list_editor.column_title_value'),
    valueErrors: {
      duplicateValue: t('code_list_editor.error_duplicate_values'),
    },
  };
}
