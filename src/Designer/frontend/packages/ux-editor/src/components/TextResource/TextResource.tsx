import React, { useState } from 'react';
import { StudioProperty } from '@studio/components';
import { useTextResourceValue } from './hooks/useTextResourceValue';
import { TextResourceAction } from './TextResourceEditor/TextResourceValueEditor/TextResourceAction';
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

export const TextResource = ({
  compact,
  generateIdOptions,
  handleIdChange,
  handleRemoveTextResource,
  label,
  textResourceId,
  disableSearch,
}: TextResourceProps) => {
  const textValue = useTextResourceValue(textResourceId);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  if (isOpen) {
    return (
      <TextResourceAction
        label={label}
        textResourceId={textResourceId}
        generateIdOptions={generateIdOptions}
        disableSearch={disableSearch}
        setIsOpen={setIsOpen}
        handleIdChange={handleIdChange}
        handleRemoveTextResource={handleRemoveTextResource}
      />
    );
  }

  return (
    <StudioProperty.Button
      compact={compact}
      onClick={() => setIsOpen(true)}
      property={label}
      value={textValue}
    />
  );
};
