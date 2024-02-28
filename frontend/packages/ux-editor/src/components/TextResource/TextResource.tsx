import React, { useState } from 'react';
import classes from './TextResource.module.css';
import { generateRandomId } from 'app-shared/utils/generateRandomId';
import { generateTextResourceId } from '../../utils/generateId';
import { TextResourceEditor } from './TextResourceEditor';
import { StudioPropertyButton } from '@studio/components';

export interface TextResourceProps {
  description?: string;
  handleIdChange: (id: string) => void;
  handleRemoveTextResource?: () => void;
  label?: string;
  placeholder?: string;
  previewMode?: boolean;
  textResourceId?: string;
  generateIdOptions?: GenerateTextResourceIdOptions;
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
  handleIdChange,
  label,
  textResourceId,
  generateIdOptions,
}: TextResourceProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleOpen = () => {
    if (!textResourceId) {
      handleIdChange(generateId(generateIdOptions));
    }
    setIsOpen(true);
  };

  return !isOpen ? (
    <StudioPropertyButton onClick={handleOpen} property={label} value={textResourceId} />
  ) : (
    <fieldset className={classes.root}>
      <legend>{label}</legend>
      <TextResourceEditor textResourceId={textResourceId} onReferenceChange={handleIdChange} />
    </fieldset>
  );
};
