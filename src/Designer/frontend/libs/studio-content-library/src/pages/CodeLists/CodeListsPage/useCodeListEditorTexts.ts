import { useTranslation } from 'react-i18next';
import type { CodeListEditorTexts, StudioLanguagePickerTexts } from '@studio/components';

export function useCodeListEditorTexts(): CodeListEditorTexts {
  const { t } = useTranslation();
  const languagePickerTexts = useLanguagePickerTexts();

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
    languagePickerTexts,
    value: t('code_list_editor.column_title_value'),
    valueErrors: {
      duplicateValue: t('code_list_editor.error_duplicate_values'),
    },
  };
}

function useLanguagePickerTexts(): StudioLanguagePickerTexts {
  const { t } = useTranslation();
  return {
    add: t('code_list_editor.language_picker.add'),
    errorCodeExists: t('code_list_editor.language_picker.error_code_exists'),
    errorEmpty: t('code_list_editor.language_picker.error_empty'),
    label: t('code_list_editor.language_picker.label'),
    newLanguageCode: t('code_list_editor.language_picker.new_language_code'),
    remove: t('code_list_editor.language_picker.remove'),
    removeConfirmMessage: (languageCode: string) =>
      t('code_list_editor.language_picker.remove_confirm_message', { languageCode }),
  };
}
