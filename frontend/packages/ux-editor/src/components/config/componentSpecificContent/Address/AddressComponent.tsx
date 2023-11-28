import React from 'react';
import { Switch, Fieldset } from '@digdir/design-system-react';
import classes from './AddressComponent.module.css';
import { useText } from '../../../../hooks';
import { IGenericEditComponent } from '../../componentConfig';
import { AddressKeys, getTextResourceByAddressKey } from '../../../../utils/component';
import { EditDataModelBindings } from '../../editModal/EditDataModelBindings';
import type { FormAddressComponent } from '../../../../types/FormComponent';
import { FormField } from '../../../FormField';
import { _useIsProdHack } from 'app-shared/utils/_useIsProdHack';

export const AddressComponent = ({ component, handleComponentChange }: IGenericEditComponent) => {
  const t = useText();

  const handleToggleAddressSimple = (isChecked: boolean) => {
    handleComponentChange({
      ...component,
      simplified: isChecked,
    });
  };

  return (
    <Fieldset className={classes.root}>
      <FormField
        id={component.id}
        value={(component as FormAddressComponent).simplified || false}
        onChange={handleToggleAddressSimple}
        propertyPath={`${component.propertyPath}/properties/simplified`}
        renderField={({ fieldProps }) => (
          <Switch
            {...fieldProps}
            size='small'
            onChange={(e) => fieldProps.onChange(e.target.checked, e)}
            checked={fieldProps.value}
          >
            {t('ux_editor.modal_configure_address_component_simplified')}
          </Switch>
        )}
      />

      {Object.keys(AddressKeys).map((value: AddressKeys, index) => {
        const simple: boolean = (component as FormAddressComponent).simplified;
        if (simple && (value === AddressKeys.careOf || value === AddressKeys.houseNumber)) {
          return null;
        }
        return (
          <EditDataModelBindings
            component={component}
            handleComponentChange={handleComponentChange}
            key={value}
            renderOptions={{
              label: getTextResourceByAddressKey(value, t),
              returnValue: value,
              key: value,
              uniqueKey: index,
            }}
          />
        );
      })}
    </Fieldset>
  );
};
