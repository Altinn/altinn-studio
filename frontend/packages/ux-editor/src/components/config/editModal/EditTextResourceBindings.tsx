import React from 'react';
import { Accordion } from '@digdir/design-system-react';
import { IGenericEditComponent } from '../componentConfig';
import { EditTextResourceBinding } from './EditTextResourceBinding';

export type TextResourceBindingKey = 'description' | 'title' | 'help' | 'body';

export interface EditTextResourceBindingsProps extends IGenericEditComponent {
  textResourceBindingKeys: string[];
}

export const EditTextResourceBindings = ({
  component,
  handleComponentChange,
  textResourceBindingKeys,
}: EditTextResourceBindingsProps) => {
  return (
    <>
      {textResourceBindingKeys.map((key: TextResourceBindingKey) => (
        <EditTextResourceBinding
          key={key}
          component={component}
          handleComponentChange={handleComponentChange}
          textKey={key}
          labelKey={`ux_editor.modal_properties_textResourceBindings_${key}`}
          placeholderKey={`ux_editor.modal_properties_textResourceBindings_${key}_add`}
        />
      ))}
    </>
  );
};
