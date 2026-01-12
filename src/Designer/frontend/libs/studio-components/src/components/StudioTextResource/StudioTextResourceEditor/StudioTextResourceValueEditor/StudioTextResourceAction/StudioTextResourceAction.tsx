import type { StudioTextResourceEditorTexts } from '@studio/components';
import {
  StudioConfigCard,
  StudioTextResourceEditor,
  StudioTextResourceTab,
} from '@studio/components';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { TextResource } from 'libs/studio-pure-functions/src';

export type StudioTextResourceActionTexts = {
  cardLabel: string;
  deleteAriaLabel: string;
  confirmDeleteMessage?: string;
  saveLabel: string;
  cancelLabel: string;
  pickerLabel: string;
  valueEditorAriaLabel: string;
  valueEditorIdLabel: string;
  noTextResourceOptionLabel: string;
  disabledSearchAlertText?: string;
  tabLabelType: string;
  tabLabelSearch: string;
};

export type StudioTextResourceActionProps = {
  textResources: TextResource[];
  textResourceId?: string;
  generateId: () => string;
  disableSearch?: boolean;
  setIsOpen: (isOpen: boolean) => void;
  handleIdChange: (id: string) => void;
  handleValueChange: (id: string, value: string) => void;
  handleRemoveTextResource?: () => void;
  texts: StudioTextResourceActionTexts;
};

export const StudioTextResourceAction = ({
  textResources,
  textResourceId,
  generateId,
  disableSearch,
  setIsOpen,
  handleIdChange,
  handleValueChange,
  handleRemoveTextResource,
  texts,
}: StudioTextResourceActionProps): React.ReactElement => {
  const getTextResourceValue = useCallback(
    (id?: string): string | undefined => {
      if (!id) {
        return undefined;
      }
      return textResources.find((tr) => tr.id === id)?.value;
    },
    [textResources],
  );

  const newId = useMemo(() => generateId(), [generateId]);

  const [activeTab, setActiveTab] = useState<StudioTextResourceTab>('type');
  const [currentTextResourceId, setCurrentTextResourceId] = useState<string>(
    textResourceId || newId,
  );

  const [initialValue, setInitialValue] = useState(() =>
    getTextResourceValue(currentTextResourceId),
  );

  const [currentTextResourceValue, setCurrentTextResourceValue] = useState(initialValue);

  useEffect(() => {
    const textResourceValue = getTextResourceValue(currentTextResourceId);
    setCurrentTextResourceValue(textResourceValue);
    setInitialValue(textResourceValue);
  }, [currentTextResourceId, getTextResourceValue]);

  const handleReferenceChange = (id?: string): void => {
    setCurrentTextResourceId(id || newId);
  };

  const handleSave = (): void => {
    if (currentTextResourceId !== textResourceId) {
      handleIdChange(currentTextResourceId);
    }
    if (currentTextResourceValue && currentTextResourceValue !== initialValue) {
      handleValueChange(currentTextResourceId, currentTextResourceValue);
    }
    setIsOpen(false);
  };

  const handleCancel = (): void => {
    setIsOpen(false);
  };

  const handleDelete = (): void => {
    handleRemoveTextResource?.();
    setIsOpen(false);
  };

  const editorTexts: StudioTextResourceEditorTexts = {
    pickerLabel: texts.pickerLabel,
    valueEditorAriaLabel: texts.valueEditorAriaLabel,
    valueEditorIdLabel: texts.valueEditorIdLabel,
    noTextResourceOptionLabel: texts.noTextResourceOptionLabel,
    disabledSearchAlertText: texts.disabledSearchAlertText,
    tabLabelType: texts.tabLabelType,
    tabLabelSearch: texts.tabLabelSearch,
  };

  const shouldShowButtons = !(activeTab === 'search' && disableSearch);
  const isSaveButtonDisabled =
    !currentTextResourceValue ||
    (currentTextResourceId === textResourceId && currentTextResourceValue === initialValue);

  return (
    <StudioConfigCard>
      <StudioConfigCard.Header
        cardLabel={texts.cardLabel}
        deleteAriaLabel={texts.deleteAriaLabel}
        confirmDeleteMessage={texts.confirmDeleteMessage}
        onDelete={handleDelete}
        isDeleteDisabled={!textResourceId}
      />
      <StudioConfigCard.Body>
        <StudioTextResourceEditor
          textResourceId={currentTextResourceId}
          onTextChange={setCurrentTextResourceValue}
          onReferenceChange={handleReferenceChange}
          disableSearch={disableSearch}
          textResourceValue={currentTextResourceValue}
          onTabChange={setActiveTab}
          texts={editorTexts}
          textResources={textResources}
        />
      </StudioConfigCard.Body>
      {shouldShowButtons && (
        <StudioConfigCard.Footer
          saveLabel={texts.saveLabel}
          cancelLabel={texts.cancelLabel}
          onCancel={handleCancel}
          onSave={handleSave}
          isLoading={false}
          isDisabled={isSaveButtonDisabled}
        />
      )}
    </StudioConfigCard>
  );
};
