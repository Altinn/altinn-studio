import React from 'react';
import { Checkbox, FieldSet } from '@digdir/design-system-react';
import classes from './AddressComponent.module.css';
import { useText } from '../../../../hooks';
import { IGenericEditComponent } from '../../componentConfig';
import { IFormAddressComponent } from '../../../../types/global';
import { AddressKeys, getTextResourceByAddressKey } from '../../../../utils/component';
import { EditDataModelBindings } from '../../editModal/EditDataModelBindings';

export const AddressComponent = ({
  component,
  handleComponentChange,
}: IGenericEditComponent) => {
  const t = useText();

  const handleToggleAddressSimple = (isChecked: boolean) => {
    handleComponentChange({
      ...component,
      simplified: isChecked,
    });
  };

  return (
    <FieldSet className={classes.root}>
      <div>
        <Checkbox
          checked={(component as IFormAddressComponent).simplified}
          label={t('ux_editor.modal_configure_address_component_simplified')}
          onChange={(e) => handleToggleAddressSimple(e.target.checked)}
        />
      </div>
      {Object.keys(AddressKeys).map((value: AddressKeys, index) => {
        const simple: boolean = (component as IFormAddressComponent).simplified;
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
}
