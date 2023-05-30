import React from 'react';
import { FieldSet, Select } from '@digdir/design-system-react';
import classes from './ButtonComponent.module.css';
import { EditTitle } from '../../editModal/EditTitle';
import { useText } from '../../../../hooks';
import { IGenericEditComponent } from '../../componentConfig';
import { ComponentType } from 'app-shared/types/ComponentType';

export const ButtonComponent = ({ component, handleComponentChange }: IGenericEditComponent) => {
  const t = useText();

  const handleButtonTypeChange = (selected: string) => {
    const componentCopy = { ...component };
    if (!componentCopy.textResourceBindings) {
      componentCopy.textResourceBindings = {};
    }
    if (selected === ComponentType.NavigationButtons) {
      componentCopy.type = ComponentType.NavigationButtons;
      componentCopy.textResourceBindings = {
        next: 'next',
        back: 'back',
      };
      componentCopy.showBackButton = true;
    } else if (selected === ComponentType.Button) {
      componentCopy.type = ComponentType.Button;
      delete componentCopy.showPrev;
      delete componentCopy.showBackButton;
      componentCopy.textResourceBindings = {
        title: t('ux_editor.modal_properties_button_type_submit'),
      };
    }
    handleComponentChange(componentCopy);
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
  ];

  return (
    <FieldSet className={classes.root}>
      <div>
        <Select
          label={t('ux_editor.modal_properties_button_type_helper')}
          options={types}
          value={types.find((element) => element.value === component.type).value}
          onChange={handleButtonTypeChange}
        />
      </div>
      {component.type === ComponentType.Button && (
        <EditTitle component={component} handleComponentChange={handleComponentChange} />
      )}
    </FieldSet>
  );
};
