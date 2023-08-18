import React from 'react';
import { Fieldset, Select } from '@digdir/design-system-react';
import classes from './ButtonComponent.module.css';
import { useText } from '../../../../hooks';
import { EditSettings, IGenericEditComponent } from '../../componentConfig';
import { ComponentType } from 'app-shared/types/ComponentType';
import { FormField } from '../../../FormField';
import { EditTextResourceBinding } from '../../editModal/EditTextResourceBinding';
import { EditTextResourceBindings } from '../../editModal/EditTextResourceBindings';
import { FormComponent, FormNavigationButtonsComponent } from '../../../../types/FormComponent';

export const ButtonComponent = ({ component, handleComponentChange }: IGenericEditComponent) => {
  const t = useText();

  const handleButtonTypeChange = (selected: string) => {
    const componentCopy = { ...component, type: selected as ComponentType };
    if (!componentCopy.textResourceBindings) {
      componentCopy.textResourceBindings = {};
    }
    if (selected === ComponentType.NavigationButtons) {
      componentCopy.type = ComponentType.NavigationButtons;
      componentCopy.textResourceBindings = {
        next: 'next',
        back: 'back',
      };
      (componentCopy as FormNavigationButtonsComponent).showBackButton = true;
    } else if (selected === ComponentType.Button) {
      componentCopy.type = ComponentType.Button;
      delete (componentCopy as FormNavigationButtonsComponent).showPrev;
      delete (componentCopy as FormNavigationButtonsComponent).showBackButton;
      componentCopy.textResourceBindings = {
        title: t('ux_editor.modal_properties_button_type_submit'),
      };
    }
    handleComponentChange(componentCopy as FormComponent);
  };

  const types = [
    {
      value: ComponentType.Button,
      label: t('ux_editor.modal_properties_button_type_submit'),
    },
    {
      value: ComponentType.NavigationButtons,
      label: t('ux_editor.modal_properties_button_type_navigation'),
    },
    {
      value: ComponentType.ActionButton,
      label: t('ux_editor.modal_properties_button_type_ActionButton'),
    },
    {
      value: ComponentType.PrintButton,
      label: t('ux_editor.modal_properties_button_type_PrintButton'),
    },
    {
      value: ComponentType.InstantiationButton,
      label: t('ux_editor.modal_properties_button_type_InstantiationButton'),
    },
  ];

  if (!types.find((element) => element.value === component.type)) return null;

  return (
    <Fieldset className={classes.root}>
      <FormField
        id={'choose-button-type'}
        onChange={handleButtonTypeChange}
        value={component.type}
        helpText={t('ux_editor.modal_properties_button_type_help_text')}
        label={t('ux_editor.modal_properties_button_type_helper')}
      >
        {({ onChange }) => <Select onChange={onChange} options={types} />}
      </FormField>
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
