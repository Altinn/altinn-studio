import React, { useMemo, useState } from 'react';
import { generateRandomId } from 'app-shared/utils/generateRandomId';
import { generateTextResourceId } from '../../utils/generateId';
import { StudioProperty } from '@studio/components';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { useTextResourceValue } from './hooks/useTextResourceValue';
import { TextResourceAction } from './TextResourceEditor/TextResourceValueEditor/TextResourceAction';
import { useUpsertTextResourceMutation } from '../../hooks/mutations/useUpsertTextResourceMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTextIdMutation } from 'app-development/hooks/mutations/useTextIdMutation';
import type { TranslationKey } from 'language/type';

export interface TextResourceProps {
  handleIdChange: (id: string) => void;
  handleRemoveTextResource?: () => void;
  label?: TranslationKey | string;
  textResourceId?: string;
  generateIdOptions?: GenerateTextResourceIdOptions;
  compact?: boolean;
  disableSearch?: boolean;
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
  disableSearch,
}: TextResourceProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: upsertTextResourceMutation } = useUpsertTextResourceMutation(org, app);
  const { mutate: textIdMutation } = useTextIdMutation(org, app);

  const fallbackId = useMemo(() => generateId(generateIdOptions), [generateIdOptions]);

  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleOpen = () => {
    if (!textResourceId) {
      handleIdChange(fallbackId);
    }
    setIsOpen(true);
  };

  const handleSave = (id: string, value: string) => {
    upsertTextResourceMutation({ textId: id, language: DEFAULT_LANGUAGE, translation: value });
    setIsOpen(false);
  };

  const handleCancel = () => setIsOpen(false);

  const handleDelete = () => {
    handleRemoveTextResource?.();
    if (textResourceId) textIdMutation([{ oldId: textResourceId }]);
  };

  return isOpen ? (
    <TextResourceAction
      legend={label}
      textResourceId={textResourceId || fallbackId}
      onSave={handleSave}
      onCancel={handleCancel}
      onDelete={handleDelete}
      onReferenceChange={handleIdChange}
      disableSearch={disableSearch}
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
  label?: TranslationKey | string;
  onOpen: () => void;
  textResourceId?: string;
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
