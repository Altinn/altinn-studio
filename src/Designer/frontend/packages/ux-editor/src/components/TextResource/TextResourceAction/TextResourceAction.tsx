import type { StudioTextResourceActionTexts } from '@studio/components';
import { StudioTextResourceAction } from '@studio/components';
import { useTranslation } from 'react-i18next';
import React, { useCallback } from 'react';
import type { TranslationKey } from '@altinn-studio/language/type';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { type GenerateTextResourceIdOptions } from '../TextResource';
import { useUpsertTextResourceMutation } from '../../../hooks/mutations/useUpsertTextResourceMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { generateId } from './TextResourceActionUtils';
import { useTextResourcesSelector } from 'app-shared/hooks';
import type { ITextResource } from 'app-shared/types/global';
import { allTextResourceIdsWithTextSelector } from 'app-shared/selectors/textResourceSelectors';

export type TextResourceActionProps = {
  label: TranslationKey | string;
  textResourceId?: string;
  generateIdOptions?: GenerateTextResourceIdOptions;
  disableSearch?: boolean;
  setIsOpen: (isOpen: boolean) => void;
  handleIdChange: (id: string) => void;
  handleRemoveTextResource?: () => void;
};

export const TextResourceAction = ({
  label,
  textResourceId,
  generateIdOptions,
  disableSearch,
  setIsOpen,
  handleIdChange,
  handleRemoveTextResource,
}: TextResourceActionProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: upsertTextResourceMutation } = useUpsertTextResourceMutation(org, app);
  const textResources: ITextResource[] = useTextResourcesSelector<ITextResource[]>(
    allTextResourceIdsWithTextSelector(DEFAULT_LANGUAGE),
  );
  const generateIdCallback = useCallback(() => generateId(generateIdOptions), [generateIdOptions]);

  const handleValueChange = (id: string, value: string) => {
    upsertTextResourceMutation({
      textId: id,
      language: DEFAULT_LANGUAGE,
      translation: value,
    });
  };

  const texts: StudioTextResourceActionTexts = {
    cardLabel: `${label} (${t('language.' + DEFAULT_LANGUAGE)})`,
    deleteAriaLabel: t('general.delete'),
    confirmDeleteMessage: t('ux_editor.text_resource_bindings.delete_confirm_question'),
    saveLabel: t('general.save'),
    cancelLabel: t('general.cancel'),
    pickerLabel: t('ux_editor.search_text_resources_label'),
    valueEditorAriaLabel: t('ux_editor.text_resource_binding_text'),
    valueEditorIdLabel: t('ux_editor.text_resource_binding_id'),
    noTextResourceOptionLabel: t('ux_editor.search_text_resources_none'),
    disabledSearchAlertText: t(
      'ux_editor.modal_properties_textResourceBindings_page_name_search_disabled',
    ),
    tabLabelType: t('ux_editor.text_resource_binding_write'),
    tabLabelSearch: t('ux_editor.text_resource_binding_search'),
  };

  return (
    <StudioTextResourceAction
      textResources={textResources}
      textResourceId={textResourceId}
      generateId={generateIdCallback}
      disableSearch={disableSearch}
      setIsOpen={setIsOpen}
      handleIdChange={handleIdChange}
      handleValueChange={handleValueChange}
      handleRemoveTextResource={handleRemoveTextResource}
      texts={texts}
    />
  );
};
