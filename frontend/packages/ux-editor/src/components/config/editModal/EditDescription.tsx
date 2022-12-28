import React from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import { TextResource } from '../../TextResource';
import { getLanguageFromKey } from 'app-shared/utils/language';

export const EditDescription = ({
  component,
  handleComponentChange,
  language,
}: IGenericEditComponent) => {
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
      label={getLanguageFromKey('ux_editor.modal_properties_description', language)}
      placeholder={getLanguageFromKey('ux_editor.modal_properties_description_add', language)}
      textResourceId={component.textResourceBindings?.description}
    />
  );
};
