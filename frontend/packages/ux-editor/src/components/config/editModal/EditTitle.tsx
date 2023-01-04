import React from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import { TextResource } from '../../TextResource';
import { useText } from '../../../hooks';

export const EditTitle = ({
  component,
  handleComponentChange,
}: IGenericEditComponent) => {
  const t = useText();
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
      label={t('ux_editor.modal_properties_label')}
      textResourceId={component.textResourceBindings?.title}
    />
  );
};
