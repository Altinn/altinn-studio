import React from 'react';
import { Checkbox, FieldSet } from '@digdir/design-system-react';
import classes from './AddressComponent.module.css';
import { useText } from '../../../../hooks';
import { IGenericEditComponent } from '../../componentConfig';
import { AddressKeys, getTextResourceByAddressKey } from '../../../../utils/component';
import { EditDataModelBindings } from '../../editModal/EditDataModelBindings';
import type { FormAddressComponent } from '../../../../types/FormComponent';
import { FormField } from '../../../FormField';
import { _useIsProdHack } from 'app-shared/utils/_useIsProdHack';

export interface AddressComponentProps extends IGenericEditComponent {
  isProd: boolean;
}

export const AddressComponent = ({
  component,
  handleComponentChange,
  isProd,
}: AddressComponentProps) => {
  const t = useText();

  const handleToggleAddressSimple = (isChecked: boolean) => {
    handleComponentChange({
      ...component,
      simplified: isChecked,
    });
  };

  if (!isProd) return null;

  return (
    <FieldSet className={classes.root} data-testid='address-component-container'>
      <FormField
        id={component.id}
        label={t('ux_editor.modal_configure_address_component_simplified')}
        value={(component as FormAddressComponent).simplified}
        onChange={handleToggleAddressSimple}
        propertyPath={`${component.propertyPath}/properties/simplified`}
      >
        {({ value, onChange }) => (
          <Checkbox checked={value} onChange={(e) => onChange(e.target.checked, e)} />
        )}
      </FormField>
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
    </FieldSet>
  );
};
