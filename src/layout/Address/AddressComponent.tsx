import React, { useEffect } from 'react';

import { LegacyTextField } from '@digdir/design-system-react';

import { Label } from 'src/components/form/Label';
import { FD } from 'src/features/formData/FormDataWrite';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { ComponentValidations } from 'src/features/validation/ComponentValidations';
import { useBindingValidationsForNode } from 'src/features/validation/selectors/bindingValidationsForNode';
import { useComponentValidationsForNode } from 'src/features/validation/selectors/componentValidationsForNode';
import { hasValidationErrors } from 'src/features/validation/utils';
import { usePostPlaceQuery } from 'src/hooks/queries/usePostPlaceQuery';
import { useEffectEvent } from 'src/hooks/useEffectEvent';
import classes from 'src/layout/Address/AddressComponent.module.css';
import type { PropsFromGenericComponent } from 'src/layout';

export type IAddressProps = PropsFromGenericComponent<'Address'>;

export function AddressComponent({ node }: IAddressProps) {
  const { id, required, readOnly, labelSettings, simplified, saveWhileTyping } = node.item;

  const bindingValidations = useBindingValidationsForNode(node);
  const componentValidations = useComponentValidationsForNode(node);

  const { formData, setValue, debounce } = useDataModelBindings(node.item.dataModelBindings, saveWhileTyping);
  const { address, careOf, postPlace, zipCode, houseNumber } = formData;

  const updatePostPlace = useEffectEvent((newPostPlace) => {
    if (newPostPlace != null && newPostPlace != postPlace) {
      setValue('postPlace', newPostPlace);
    }
  });

  const zipCodeDebounced = FD.useDebouncedPick(node.item.dataModelBindings.zipCode);
  const slowZip = typeof zipCodeDebounced === 'string' ? zipCodeDebounced : undefined;
  const postPlaceQueryData = usePostPlaceQuery(slowZip, !hasValidationErrors(bindingValidations?.zipCode));
  useEffect(() => updatePostPlace(postPlaceQueryData), [postPlaceQueryData, updatePostPlace]);

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
          isValid={!hasValidationErrors(bindingValidations?.address)}
          value={address}
          onChange={(ev) => setValue('address', ev.target.value)}
          onBlur={debounce}
          readOnly={readOnly}
          required={required}
          autoComplete={simplified ? 'street-address' : 'address-line1'}
        />
        <ComponentValidations
          validations={bindingValidations?.address}
          node={node}
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
            isValid={!hasValidationErrors(bindingValidations?.careOf)}
            value={careOf}
            onChange={(ev) => setValue('careOf', ev.target.value)}
            onBlur={debounce}
            readOnly={readOnly}
            autoComplete='address-line2'
          />
          <ComponentValidations
            validations={bindingValidations?.careOf}
            node={node}
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
              isValid={!hasValidationErrors(bindingValidations?.zipCode)}
              value={zipCode}
              onChange={(ev) => setValue('zipCode', ev.target.value)}
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
            isValid={!hasValidationErrors(bindingValidations?.postPlace)}
            value={postPlace}
            readOnly={true}
            required={required}
            autoComplete='address-level1'
          />
        </div>
        <ComponentValidations
          validations={bindingValidations?.zipCode}
          node={node}
        />
        <ComponentValidations
          validations={bindingValidations?.postPlace}
          node={node}
        />
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
              isValid={!hasValidationErrors(bindingValidations?.houseNumber)}
              value={houseNumber}
              onChange={(ev) => setValue('houseNumber', ev.target.value)}
              onBlur={debounce}
              readOnly={readOnly}
              autoComplete='address-line3'
            />
          </div>
          <ComponentValidations
            validations={bindingValidations?.houseNumber}
            node={node}
          />
        </div>
      )}

      <ComponentValidations
        validations={componentValidations}
        node={node}
      />
    </div>
  );
}
