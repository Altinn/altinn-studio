import React, { useEffect, useState } from 'react';
import { generateRandomId } from 'app-shared/utils/generateRandomId';
import { generateTextResourceId } from '../../utils/generateId';
import { StudioProperty, usePrevious } from '@studio/components-legacy';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { useFormItemContext } from '../../containers/FormItemContext';
import { useAppContext } from '../../hooks';
import { useTextResourceValue } from './hooks/useTextResourceValue';
import { TextResourceAction } from './TextResourceEditor/TextResourceValueEditor/TextResourceAction';
import { useUpsertTextResourceMutation } from '../../hooks/mutations/useUpsertTextResourceMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTextIdMutation } from 'app-development/hooks/mutations/useTextIdMutation';
import type { TranslationKey } from 'language/type';

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
  const { formItemId } = useFormItemContext();
  const { selectedFormLayoutName: formLayoutName } = useAppContext();
  const { org, app } = useStudioEnvironmentParams();
  const { mutate } = useUpsertTextResourceMutation(org, app);
  const { mutate: textIdMutation } = useTextIdMutation(org, app);

  const prevFormItemId = usePrevious(formItemId);
  const prevFormLayoutName = usePrevious(formLayoutName);

  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleOpen = () => {
    if (!textResourceId) {
      handleIdChange(generateId(generateIdOptions));
    }
    setIsOpen(true);
  };

  const handleSave = (id: string, value: string) => {
    mutate({ textId: id, language: DEFAULT_LANGUAGE, translation: value });
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const handleDelete = () => {
    handleRemoveTextResource?.();
    if (textResourceId) textIdMutation([{ oldId: textResourceId }]);
  };

  useEffect(() => {
    if (formItemId !== prevFormItemId || formLayoutName !== prevFormLayoutName) {
      setIsOpen(false);
    }
  }, [formItemId, prevFormItemId, formLayoutName, prevFormLayoutName]);

  return isOpen ? (
    <TextResourceAction
      legend={label as TranslationKey}
      textResourceId={textResourceId || generateId(generateIdOptions)}
      onSave={handleSave}
      onCancel={handleCancel}
      onDelete={handleDelete}
      onReferenceChange={handleIdChange}
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
