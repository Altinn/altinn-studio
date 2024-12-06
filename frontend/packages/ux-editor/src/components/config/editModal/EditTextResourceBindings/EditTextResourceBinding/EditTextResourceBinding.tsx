import React from 'react';
import { TextResource } from '../../../../TextResource/TextResource';
import type { TranslationKey } from '@altinn-studio/language/type';
import { useTranslation } from 'react-i18next';
import type { EditTextResourceBindingBase } from '../EditTextResourceBindings';
import { useAppContext } from '../../../../../hooks';

export interface EditTextResourceBindingProps extends EditTextResourceBindingBase {
  textKey: string;
  labelKey: TranslationKey;
  descriptionKey?: TranslationKey;
  placeholderKey?: TranslationKey;
  removeTextResourceBinding?: () => void;
}

export const EditTextResourceBinding = ({
  component,
  handleComponentChange,
  removeTextResourceBinding,
  textKey,
  labelKey,
}: EditTextResourceBindingProps) => {
  const { t } = useTranslation();
  const { selectedFormLayoutName } = useAppContext();

  const handleTextResourceIdChange = (value: string) =>
    handleComponentChange({
      ...component,
      textResourceBindings: {
        ...component.textResourceBindings,
        [textKey]: value,
      },
    });

  const handleRemoveTextResourceBinding = () => {
    const componentCopy = { ...component };
    delete componentCopy.textResourceBindings?.[textKey];
    handleComponentChange(componentCopy);
    removeTextResourceBinding?.();
  };

  return (
    <TextResource
      handleIdChange={handleTextResourceIdChange}
      handleRemoveTextResource={handleRemoveTextResourceBinding}
      label={t(labelKey)}
      textResourceId={
        component.textResourceBindings ? component.textResourceBindings[textKey] : undefined
      }
      generateIdOptions={{
        componentId: component.id,
        layoutId: selectedFormLayoutName,
        textResourceKey: textKey,
      }}
    />
  );
};
