import React from 'react';

import { LegacyTextField } from '@digdir/design-system-react';

import { Label } from 'src/components/form/Label';
import { FD } from 'src/features/formData/FormDataWrite';
import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/Address/AddressComponent.module.css';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IDataModelBindingsForAddressInternal } from 'src/layout/Address/config.generated';

export type IAddressComponentProps = PropsFromGenericComponent<'AddressComponent'>;

type AddressKey = keyof IDataModelBindingsForAddressInternal;

export function AddressComponent({ node }: IAddressComponentProps) {
  const { id, required, readOnly, labelSettings, simplified, saveWhileTyping } = node.item;

  const bindings = ('dataModelBindings' in node.item && node.item.dataModelBindings) || {};
  const saveData = FD.useSetForBindings(bindings, saveWhileTyping);
  const debounce = FD.useDebounceImmediately();
  const { address, careOf, postPlace, zipCode, houseNumber } = FD.usePickFreshStrings(bindings);

  const onSaveField = React.useCallback(
    (key: AddressKey, value: any) => {
      saveData(key, value);
      if (key === 'zipCode' && !value) {
        // if we are removing a zip code, also remove post place from form data
        saveData('postPlace', '');
      }
    },
    [saveData],
  );

  return (
    <div
      className={classes.addressComponent}
      key={`address_component_${id}`}
    >
      <div>
        <Label
          label={<Lang id={'address_component.address'} />}
          helpText={undefined}
          id={`address_address_${id}`}
          required={required}
          readOnly={readOnly}
          labelSettings={labelSettings}
        />
        <LegacyTextField
          id={`address_address_${id}`}
          isValid={true} // TODO: Fix in validation rewrite
          value={address}
          onChange={(ev) => saveData('address', ev.target.value)}
          onBlur={debounce}
          readOnly={readOnly}
          required={required}
          autoComplete={simplified ? 'street-address' : 'address-line1'}
        />
      </div>

      {!simplified && (
        <div>
          <Label
            label={<Lang id={'address_component.care_of'} />}
            helpText={undefined}
            id={`address_care_of_${id}`}
            required={required}
            readOnly={readOnly}
            labelSettings={labelSettings}
          />
          <LegacyTextField
            id={`address_care_of_${id}`}
            isValid={true} // TODO: Fix in validation rewrite
            value={careOf}
            onChange={(ev) => saveData('careOf', ev.target.value)}
            onBlur={debounce}
            readOnly={readOnly}
            autoComplete='address-line2'
          />
        </div>
      )}

      <div className={classes.addressComponentPostplaceZipCode}>
        <div className={classes.addressComponentZipCode}>
          <Label
            label={<Lang id={'address_component.zip_code'} />}
            helpText={undefined}
            id={`address_zip_code_${id}`}
            required={required}
            readOnly={readOnly}
            labelSettings={labelSettings}
          />
          <div className={classes.addressComponentSmallInputs}>
            <LegacyTextField
              id={`address_zip_code_${id}`}
              isValid={true} // TODO: Fix in validation rewrite
              value={zipCode}
              onChange={(ev) => onSaveField('zipCode', ev.target.value)}
              onBlur={debounce}
              readOnly={readOnly}
              required={required}
              inputMode='numeric'
              autoComplete='postal-code'
            />
          </div>
        </div>

        <div className={classes.addressComponentPostplace}>
          <Label
            label={<Lang id={'address_component.post_place'} />}
            helpText={undefined}
            id={`address_post_place_${id}`}
            required={required}
            readOnly={true}
            labelSettings={labelSettings}
          />
          <LegacyTextField
            id={`address_post_place_${id}`}
            isValid={true} // TODO: Fix in validation rewrite
            value={postPlace}
            readOnly={true}
            required={required}
            autoComplete='address-level1'
          />
        </div>
      </div>

      {!simplified && (
        <div>
          <Label
            label={<Lang id={'address_component.house_number'} />}
            helpText={undefined}
            id={`address_house_number_${id}`}
            required={required}
            readOnly={readOnly}
            labelSettings={labelSettings}
          />
          <p>
            <Lang id={'address_component.house_number_helper'} />
          </p>
          <div className={classes.addressComponentSmallInputs}>
            <LegacyTextField
              id={`address_house_number_${id}`}
              isValid={true} // TODO: Fix in validation rewrite
              value={houseNumber}
              onChange={(ev) => saveData('houseNumber', ev.target.value)}
              onBlur={debounce}
              readOnly={readOnly}
              autoComplete='address-line3'
            />
          </div>
        </div>
      )}
    </div>
  );
}
