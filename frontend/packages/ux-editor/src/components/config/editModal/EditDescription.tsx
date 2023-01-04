import React from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import { TextResource } from '../../TextResource';
import { useText } from '../../../hooks';

export const EditDescription = ({
  component,
  handleComponentChange,
}: IGenericEditComponent) => {
  const t = useText();
  const handleIdChange = (id: string) => handleComponentChange({
    ...component,
    textResourceBindings: {
      ...component.textResourceBindings,
      description: id,
    }
  });
  return (
    <TextResource
      handleIdChange={handleIdChange}
      label={t('ux_editor.modal_properties_description')}
      placeholder={t('ux_editor.modal_properties_description_add')}
      textResourceId={component.textResourceBindings?.description}
    />
  );
};
