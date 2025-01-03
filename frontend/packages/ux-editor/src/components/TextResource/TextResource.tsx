import React, { useEffect, useState } from 'react';
import { generateRandomId } from 'app-shared/utils/generateRandomId';
import { generateTextResourceId } from '../../utils/generateId';
import { TextResourceEditor } from './TextResourceEditor';
import { StudioButton, StudioDeleteButton, StudioProperty, usePrevious } from '@studio/components';
import { XMarkIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { useFormItemContext } from '../../containers/FormItemContext';
import { useAppContext } from '../../hooks';
import { useTextResourceValue } from './hooks/useTextResourceValue';

export interface TextResourceProps {
  handleIdChange: (id: string) => void;
  handleRemoveTextResource?: () => void;
  label?: string;
  textResourceId?: string;
  generateIdOptions?: GenerateTextResourceIdOptions;
  compact?: boolean;
  disableEditor?: boolean;
  children?: React.ReactNode;
}

export interface GenerateTextResourceIdOptions {
  componentId: string;
  layoutId: string;
  textResourceKey: string;
}

export const generateId = (options?: GenerateTextResourceIdOptions) => {
  if (!options) {
    return generateRandomId(12);
  }
  return generateTextResourceId(options.layoutId, options.componentId, options.textResourceKey);
};

export const TextResource = ({
  compact,
  generateIdOptions,
  handleIdChange,
  handleRemoveTextResource,
  label,
  textResourceId,
  disableEditor,
  children,
}: TextResourceProps) => {
  const { formItemId } = useFormItemContext();
  const { selectedFormLayoutName: formLayoutName } = useAppContext();

  const prevFormItemId = usePrevious(formItemId);
  const prevFormLayoutName = usePrevious(formLayoutName);

  const initialTextResourceValue = useTextResourceValue(textResourceId);
  const [currentValue, setCurrentValue] = useState<string>(initialTextResourceValue);

  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleOpen = () => {
    if (!textResourceId) {
      handleIdChange(generateId(generateIdOptions));
    }
    setIsOpen(true);
  };

  const handleClose = () => {
    if (currentValue === '') {
      handleRemoveTextResource?.();
    }
    setIsOpen(false);
  };

  const handleDelete = () => {
    handleRemoveTextResource();
    setIsOpen(false);
  };

  useEffect(() => {
    if (formItemId !== prevFormItemId || formLayoutName !== prevFormLayoutName) {
      setIsOpen(false);
    }
  }, [formItemId, prevFormItemId, formLayoutName, prevFormLayoutName]);

  return isOpen ? (
    <TextResourceFieldset
      compact={compact}
      legend={label}
      onClose={handleClose}
      onDelete={handleRemoveTextResource ? handleDelete : undefined}
      onSetCurrentValue={setCurrentValue}
      onReferenceChange={handleIdChange}
      textResourceId={textResourceId}
      showTextResourceEditor={!disableEditor}
    >
      {children}
    </TextResourceFieldset>
  ) : (
    <TextResourceButton
      compact={compact}
      label={label}
      onOpen={handleOpen}
      textResourceId={textResourceId}
    />
  );
};

type TextResourceFieldsetProps = {
  compact?: boolean;
  legend: string;
  onClose: () => void;
  onDelete: () => void;
  onReferenceChange: (id: string) => void;
  onSetCurrentValue: (value: string) => void;
  textResourceId: string;
  showTextResourceEditor?: boolean;
  children?: React.ReactNode;
};

const TextResourceFieldset = ({
  compact,
  legend,
  onClose,
  onDelete,
  onReferenceChange,
  onSetCurrentValue,
  textResourceId,
  showTextResourceEditor = true,
  children,
}: TextResourceFieldsetProps) => {
  const { t } = useTranslation();

  return (
    <StudioProperty.Fieldset
      compact={compact}
      legend={legend}
      menubar={
        <>
          {showTextResourceEditor && <span>{t('language.' + DEFAULT_LANGUAGE)}</span>}
          <StudioButton
            icon={<XMarkIcon />}
            onClick={onClose}
            title={t('general.close')}
            variant='secondary'
          />
          {showTextResourceEditor && (
            <StudioDeleteButton
              confirmMessage={t('ux_editor.text_resource_bindings.delete_confirm_question')}
              disabled={!onDelete}
              onDelete={() => onDelete?.()}
              title={t('general.delete')}
            />
          )}
        </>
      }
    >
      {showTextResourceEditor && (
        <TextResourceEditor
          textResourceId={textResourceId}
          onReferenceChange={onReferenceChange}
          onSetCurrentValue={onSetCurrentValue}
        />
      )}
      {children}
    </StudioProperty.Fieldset>
  );
};

type TextResourceButtonProps = {
  compact?: boolean;
  label: string;
  onOpen: () => void;
  textResourceId: string;
};

const TextResourceButton = ({
  compact,
  label,
  onOpen,
  textResourceId,
}: TextResourceButtonProps) => {
  const value = useTextResourceValue(textResourceId);
  return (
    <StudioProperty.Button compact={compact} onClick={onOpen} property={label} value={value} />
  );
};
