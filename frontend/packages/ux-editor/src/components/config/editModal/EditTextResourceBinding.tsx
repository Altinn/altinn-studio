import React from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import { TextResource } from '../../TextResource';
import { useText } from '../../../hooks';
import { TranslationKey } from 'language/type';

export interface EditTextResourceBindingProps extends IGenericEditComponent {
  textKey: string;
  labelKey: TranslationKey;
  descriptionKey?: TranslationKey;
  placeholderKey?: TranslationKey;
}

export const EditTextResourceBinding = ({
  component,
  handleComponentChange,
  textKey,
  labelKey,
  descriptionKey,
  placeholderKey,
}: EditTextResourceBindingProps) => {
  const t = useText();
  const handleTextResourceChange = (value: string) => handleComponentChange({
    ...component,
    textResourceBindings: {
      ...component.textResourceBindings,
      [textKey]: value,
    }
  });
  return (
    <TextResource
      handleIdChange={handleTextResourceChange}
      label={t(labelKey)}
      description={t(descriptionKey)}
      placeholder={t(placeholderKey)}
      textResourceId={component.textResourceBindings ? component.textResourceBindings[textKey] : undefined}
    />
  );
};
