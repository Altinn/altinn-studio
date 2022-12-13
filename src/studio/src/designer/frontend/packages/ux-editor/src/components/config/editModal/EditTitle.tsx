import React from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import { TextResource } from '../../TextResource';
import { getLanguageFromKey } from 'app-shared/utils/language';

export const EditTitle = ({
  component,
  handleComponentChange,
  language,
}: IGenericEditComponent) => {
  const handleIdChange = (id: string) => handleComponentChange({
    ...component,
    textResourceBindings: {
      ...component.textResourceBindings,
      title: id,
    }
  });
  return (
    <TextResource
      handleIdChange={handleIdChange}
      label={getLanguageFromKey('ux_editor.modal_properties_label', language)}
      textResourceId={component.textResourceBindings?.title}
    />
  );
};
