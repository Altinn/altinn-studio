import React from 'react';
import { Switch, Fieldset } from '@digdir/design-system-react';
import classes from './AddressComponent.module.css';
import { useText } from '../../../../hooks';
import type { IGenericEditComponent } from '../../componentConfig';
import { AddressKeys, getTextResourceByAddressKey } from '../../../../utils/component';
import { EditDataModelBindings } from '../../editModal/EditDataModelBindings/EditDataModelBindings';
import type { FormAddressComponent } from '../../../../types/FormComponent';
import { FormField } from '../../../FormField';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { StudioProperty } from '@studio/components';

export const AddressComponent = ({
  component,
  handleComponentChange,
}: IGenericEditComponent<ComponentType.Address>) => {
  const t = useText();

  const handleToggleAddressSimple = (isChecked: boolean) => {
    handleComponentChange({
      ...component,
      simplified: isChecked,
    });
  };

  return (
    <Fieldset
      className={classes.root}
      legend={t('ux_editor.address_component.settings')}
      hideLegend
    >
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

      <StudioProperty.Group>
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
      </StudioProperty.Group>
    </Fieldset>
  );
};
