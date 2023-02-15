import React from 'react';
import { useSelector } from 'react-redux';
import type { IGenericEditComponent } from '../componentConfig';
import { TextResource } from '../../TextResource';
import { useText } from '../../../hooks';
import { TranslationKey } from 'language/type';
import { IAppState } from '../../../types/global';

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
  const selectedLayout = useSelector(
    (state: IAppState) => state.formDesigner?.layout?.selectedLayout
  );

  const handleTextResourceChange = (value: string) =>
    handleComponentChange({
      ...component,
      textResourceBindings: {
        ...component.textResourceBindings,
        [textKey]: value,
      },
    });
  return (
    <TextResource
      handleIdChange={handleTextResourceChange}
      label={t(labelKey)}
      description={t(descriptionKey)}
      placeholder={t(placeholderKey)}
      textResourceId={
        component.textResourceBindings ? component.textResourceBindings[textKey] : undefined
      }
      generateIdOptions={{
        componentId: component.id,
        layoutId: selectedLayout,
        textResourceKey: textKey,
      }}
    />
  );
};
