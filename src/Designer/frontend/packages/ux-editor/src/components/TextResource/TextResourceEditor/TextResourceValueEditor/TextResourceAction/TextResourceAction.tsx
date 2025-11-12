import { StudioConfigCard } from '@studio/components';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useMemo, useState } from 'react';
import { TextResourceEditor, TextResourceTab } from '../../TextResourceEditor';
import type { TranslationKey } from '@altinn-studio/language/type';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { type GenerateTextResourceIdOptions } from '../../../TextResource';
import { useUpsertTextResourceMutation } from '../../../../../hooks/mutations/useUpsertTextResourceMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTextResourceValue } from '../../../hooks/useTextResourceValue';
import { generateId } from './textfResourceActionUtils';

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
  const defaultId = useMemo(() => generateId(generateIdOptions), [generateIdOptions]);
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: upsertTextResourceMutation } = useUpsertTextResourceMutation(org, app);
  const [activeTab, setActiveTab] = useState<TextResourceTab>(TextResourceTab.Type);
  const [currentTextResourceId, setCurrentTextResourceId] = useState<string>(
    textResourceId || defaultId,
  );
  const initialValue = useTextResourceValue(textResourceId);
  const textValue = useTextResourceValue(currentTextResourceId);
  const [textResourceValue, setTextResourceValue] = useState(textValue);

  useEffect(() => {
    setTextResourceValue(textValue);
  }, [textValue]);

  const handleReferenceChange = (id: string) => {
    setCurrentTextResourceId(id || defaultId);
  };

  const handleSave = () => {
    handleIdChange(currentTextResourceId);
    upsertTextResourceMutation({
      textId: currentTextResourceId,
      language: DEFAULT_LANGUAGE,
      translation: textResourceValue,
    });
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const handleDelete = () => {
    handleRemoveTextResource?.();
    setIsOpen(false);
  };

  const shouldShowButtons = !(activeTab === TextResourceTab.Search && disableSearch);
  const isSaveButtonDisabled = !textResourceValue?.trim() || textResourceValue === initialValue;

  return (
    <StudioConfigCard>
      <StudioConfigCard.Header
        cardLabel={`${label} (${t('language.' + DEFAULT_LANGUAGE)})`}
        deleteAriaLabel={t('general.delete')}
        confirmDeleteMessage={t('ux_editor.text_resource_bindings.delete_confirm_question')}
        onDelete={handleDelete}
        isDeleteDisabled={!textResourceId}
      />
      <StudioConfigCard.Body>
        <TextResourceEditor
          textResourceId={currentTextResourceId}
          onTextChange={setTextResourceValue}
          onReferenceChange={handleReferenceChange}
          disableSearch={disableSearch}
          textResourceValue={textResourceValue}
          onTabChange={setActiveTab}
        />
      </StudioConfigCard.Body>
      {shouldShowButtons && (
        <StudioConfigCard.Footer
          saveLabel={t('general.save')}
          cancelLabel={t('general.cancel')}
          onCancel={handleCancel}
          onSave={handleSave}
          isLoading={false}
          isDisabled={isSaveButtonDisabled}
        />
      )}
    </StudioConfigCard>
  );
};
