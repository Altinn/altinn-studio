import React from 'react';
import { Fieldset } from '@digdir/designsystemet-react';
import classes from './ButtonComponent.module.css';
import type { IGenericEditComponent } from '../../componentConfig';
import { EditSettings } from '../../componentConfig';
import { EditTextResourceBinding } from '../../editModal/EditTextResourceBinding';
import { EditTextResourceBindings } from '../../editModal/EditTextResourceBindings';
import { useTranslation } from 'react-i18next';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';

export const ButtonComponent = ({ component, handleComponentChange }: IGenericEditComponent) => {
  const { t } = useTranslation();
  return (
    <Fieldset className={classes.root} legend={t('ux_editor.button_component.settings')} hideLegend>
      {component.type === ComponentTypeV3.Button && (
        <EditTextResourceBinding
          component={component}
          handleComponentChange={handleComponentChange}
          textKey={EditSettings.Title}
          labelKey={`ux_editor.modal_properties_textResourceBindings_${EditSettings.Title}`}
          placeholderKey={`ux_editor.modal_properties_textResourceBindings_${EditSettings.Title}_add`}
        />
      )}
      {component.type === ComponentTypeV3.NavigationButtons && (
        <EditTextResourceBindings
          component={component}
          handleComponentChange={handleComponentChange}
          textResourceBindingKeys={['next', 'back']}
        />
      )}
    </Fieldset>
  );
};
