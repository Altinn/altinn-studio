import React from 'react';
import { Fieldset } from '@digdir/design-system-react';
import classes from './ButtonComponent.module.css';
import type { IGenericEditComponent } from '../../componentConfig';
import { EditSettings } from '../../componentConfig';
import { ComponentType } from 'app-shared/types/ComponentType';
import { EditTextResourceBinding } from '../../editModal/EditTextResourceBinding';
import { EditTextResourceBindings } from '../../editModal/EditTextResourceBindings';
import { useTranslation } from 'react-i18next';

export const ButtonComponent = ({ component, handleComponentChange }: IGenericEditComponent) => {
  const { t } = useTranslation();
  return (
    <Fieldset className={classes.root} legend={t('ux_editor.button_component.settings')} hideLegend>
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
    </Fieldset>
  );
};
