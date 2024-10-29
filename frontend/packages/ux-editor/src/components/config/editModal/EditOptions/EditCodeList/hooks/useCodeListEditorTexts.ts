import { useTranslation } from 'react-i18next';

export const useCodeListEditorTexts = () => {
  const { t } = useTranslation();

  return {
    add: t('ux_editor.modal_new_option'),
    codeList: t('ux_editor.modal_add_options_codelist'),
    delete: t('general.delete'),
    deleteItem: (number) => t('ux_editor.modal_properties_code_list_delete_item', { number }),
    description: t('general.description'),
    emptyCodeList: t('ux_editor.modal_properties_code_list_empty'),
    helpText: t('ux_editor.options_text_help_text'),
    itemDescription: (number) =>
      t('ux_editor.modal_properties_code_list_item_description', { number }),
    itemHelpText: (number) => t('ux_editor.modal_properties_code_list_item_helpText', { number }),
    itemLabel: (number) => t('ux_editor.modal_properties_code_list_item_label', { number }),
    itemValue: (number) => t('ux_editor.modal_properties_code_list_item_value', { number }),
    label: t('ux_editor.options_text_label'),
    value: t('general.value'),
  };
};
