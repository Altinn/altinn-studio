import {
  StudioButton,
  StudioFieldset,
  StudioDeleteButton,
  StudioHeading,
} from '@studio/components';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { CheckmarkIcon, XMarkIcon } from '@studio/icons';
import { TextResourceEditor } from '../..';
import classes from './TextResourceAction.module.css';
import type { TranslationKey } from '@altinn-studio/language/type';
import { useTextResourceValue } from '../../../hooks/useTextResourceValue';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';

export type TextResourceActionProps = {
  legend: TranslationKey;
  textResourceId: string;
  onReferenceChange?: (id: string) => void;
  onSave: (textResourceId: string, value: string) => void;
  onCancel: () => void;
  onDelete: () => void;
  disableSearch?: boolean;
};

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

  return (
    <StudioFieldset
      aria-label={legend}
      className={classes.fieldset}
      legend={
        <div className={classes.header}>
          <StudioHeading>
            {legend} ({t('language.' + DEFAULT_LANGUAGE)})
          </StudioHeading>
          <StudioDeleteButton
            disabled={!(initialValue && initialValue.trim() !== '')}
            confirmMessage={t('ux_editor.text_resource_bindings.delete_confirm_question')}
            onDelete={handleDelete}
          >
            {t('general.delete')}
          </StudioDeleteButton>
        </div>
      }
    >
      <TextResourceEditor
        textResourceId={textResourceId}
        onTextChange={handleTextChange}
        onReferenceChange={onReferenceChange}
        disableSearch={disableSearch}
        textResourceValue={textResourceValue}
      />
      <div className={classes.buttonGroup}>
        <StudioButton
          variant='primary'
          onClick={handleSave}
          icon={<CheckmarkIcon />}
          disabled={!textResourceValue || textResourceValue.trim() === ''}
        >
          {t('general.save')}
        </StudioButton>
        <StudioButton variant='secondary' onClick={handleCancel} icon={<XMarkIcon />}>
          {t('general.cancel')}
        </StudioButton>
      </div>
    </StudioFieldset>
  );
};
