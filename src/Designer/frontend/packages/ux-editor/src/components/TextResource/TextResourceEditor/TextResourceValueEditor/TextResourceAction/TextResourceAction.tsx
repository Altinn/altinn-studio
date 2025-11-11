import { StudioConfigCard } from '@studio/components';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { TextResourceEditor } from '../../TextResourceEditor';
import type { TranslationKey } from '@altinn-studio/language/type';
import { useTextResourceValue } from '../../../hooks/useTextResourceValue';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';

export type TextResourceActionProps = {
  legend: TranslationKey | string;
  textResourceId: string;
  onReferenceChange?: (id: string) => void;
  onSave: (textResourceId: string, value: string) => void;
  onCancel: () => void;
  onDelete: () => void;
  disableSearch?: boolean;
};

enum TextResourceTab {
  Type = 'type',
  Search = 'search',
}

export const TextResourceAction = ({
  legend,
  textResourceId,
  onSave,
  onCancel,
  onDelete,
  onReferenceChange,
  disableSearch,
}: TextResourceActionProps) => {
  const { t } = useTranslation();
  const initialValue = useTextResourceValue(textResourceId);
  const [textResourceValue, setTextResourceValue] = useState(initialValue);
  const [activeTab, setActiveTab] = useState<TextResourceTab>(TextResourceTab.Type);

  useEffect(() => {
    setTextResourceValue(initialValue);
  }, [initialValue, textResourceId]);

  const handleTextChange = (newValue: string) => setTextResourceValue(newValue);

  const handleSave = () => onSave(textResourceId, textResourceValue);

  const handleCancel = () => {
    setTextResourceValue(initialValue);
    onCancel();
  };

  const handleDelete = () => {
    onDelete();
    onCancel();
  };

  const shouldShowButtons = !(activeTab === TextResourceTab.Search && disableSearch);

  return (
    <StudioConfigCard>
      <StudioConfigCard.Header
        cardLabel={`${legend} (${t('language.' + DEFAULT_LANGUAGE)})`}
        deleteAriaLabel={t('general.delete')}
        confirmDeleteMessage={t('ux_editor.text_resource_bindings.delete_confirm_question')}
        onDelete={handleDelete}
        isDeleteDisabled={!(initialValue && initialValue.trim() !== '')}
      />
      <StudioConfigCard.Body>
        <TextResourceEditor
          textResourceId={textResourceId}
          onTextChange={handleTextChange}
          onReferenceChange={onReferenceChange}
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
          isDisabled={!textResourceValue?.trim()}
        />
      )}
    </StudioConfigCard>
  );
};
