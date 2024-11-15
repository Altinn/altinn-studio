import { useTranslation } from 'react-i18next';
import type { CodeListEditorTexts } from '@studio/components';

export const useOptionListEditorTexts = (): CodeListEditorTexts => {
  const { t } = useTranslation();

  return {
    add: t('ux_editor.modal_new_option'),
    codeList: t('ux_editor.modal_add_options_codelist'),
    delete: t('general.delete'),
    deleteItem: (number: number) =>
      t('ux_editor.modal_properties_code_list_delete_item', { number }),
    description: t('general.description'),
    emptyCodeList: t('ux_editor.modal_properties_code_list_empty'),
    valueErrors: {
      duplicateValue: t('ux_editor.radios_error_DuplicateValues'),
    },
    generalError: t('ux_editor.modal_properties_code_list_general_error'),
    helpText: t('ux_editor.modal_properties_textResourceBindings_help'),
    itemDescription: (number: number) =>
      t('ux_editor.modal_properties_code_list_item_description', { number }),
    itemHelpText: (number: number) =>
      t('ux_editor.modal_properties_code_list_item_helpText', { number }),
    itemLabel: (number: number) => t('ux_editor.modal_properties_code_list_item_label', { number }),
    itemValue: (number: number) => t('ux_editor.modal_properties_code_list_item_value', { number }),
    label: t('ux_editor.modal_properties_textResourceBindings_title'),
    value: t('general.value'),
  };
};
