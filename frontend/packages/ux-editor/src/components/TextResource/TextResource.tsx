import React, { useState } from 'react';
import { generateRandomId } from 'app-shared/utils/generateRandomId';
import { generateTextResourceId } from '../../utils/generateId';
import { TextResourceEditor } from './TextResourceEditor';
import {
  StudioButton,
  StudioDeleteButton,
  StudioPropertyButton,
  StudioPropertyFieldset,
} from '@studio/components';
import { XMarkIcon } from '@navikt/aksel-icons';
import { TextResourceValue } from './TextResourceValue';
import { useTranslation } from 'react-i18next';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';

export interface TextResourceProps {
  handleIdChange: (id: string) => void;
  handleRemoveTextResource?: () => void;
  label?: string;
  textResourceId?: string;
  generateIdOptions?: GenerateTextResourceIdOptions;
  compact?: boolean;
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
}: TextResourceProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleOpen = () => {
    if (!textResourceId) {
      handleIdChange(generateId(generateIdOptions));
    }
    setIsOpen(true);
  };

  return isOpen ? (
    <TextResourceFieldset
      compact={compact}
      legend={label}
      onClose={() => setIsOpen(false)}
      onDelete={handleRemoveTextResource}
      onReferenceChange={handleIdChange}
      textResourceId={textResourceId}
    />
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
  textResourceId: string;
};

const TextResourceFieldset = ({
  compact,
  legend,
  onClose,
  onDelete,
  onReferenceChange,
  textResourceId,
}: TextResourceFieldsetProps) => {
  const { t } = useTranslation();

  const handleDelete = () => {
    onDelete?.();
    onClose();
  };

  return (
    <StudioPropertyFieldset
      compact={compact}
      legend={legend}
      menubar={
        <>
          <span>{t('language.' + DEFAULT_LANGUAGE)}</span>
          <StudioButton
            icon={<XMarkIcon />}
            onClick={onClose}
            size='small'
            title={t('general.close')}
            variant='secondary'
          />
          <StudioDeleteButton
            confirmMessage={t('ux_editor.text_resource_bindings.delete_confirm_question')}
            disabled={!onDelete}
            onDelete={handleDelete}
            title={t('general.delete')}
          />
        </>
      }
    >
      <TextResourceEditor textResourceId={textResourceId} onReferenceChange={onReferenceChange} />
    </StudioPropertyFieldset>
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
  const value = textResourceId ? <TextResourceValue id={textResourceId} /> : null;
  return <StudioPropertyButton compact={compact} onClick={onOpen} property={label} value={value} />;
};
