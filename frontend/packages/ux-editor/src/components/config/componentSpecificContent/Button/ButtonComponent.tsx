import React from 'react';
import { LegacyFieldSet } from '@digdir/design-system-react';
import classes from './ButtonComponent.module.css';
import { EditSettings, IGenericEditComponent } from '../../componentConfig';
import { ComponentType } from 'app-shared/types/ComponentType';
import { EditTextResourceBinding } from '../../editModal/EditTextResourceBinding';
import { EditTextResourceBindings } from '../../editModal/EditTextResourceBindings';

export const ButtonComponent = ({
  component,
  handleComponentChange,
}: IGenericEditComponent) => {
  return (
    <LegacyFieldSet className={classes.root}>
      {component.type === ComponentType.Button && (
        <EditTextResourceBinding
          component={component}
          handleComponentChange={handleComponentChange}
          textKey={EditSettings.Title}
          labelKey={`ux_editor.modal_properties_textResourceBindings_${EditSettings.Title}`}
          placeholderKey={`ux_editor.modal_properties_textResourceBindings_${EditSettings.Title}_add`}
        />
      )}
      {component.type === ComponentType.NavigationButtons && (
        <EditTextResourceBindings
          component={component}
          handleComponentChange={handleComponentChange}
          textResourceBindingKeys={['next', 'back']}
        />
      )}
    </LegacyFieldSet>
  );
};
