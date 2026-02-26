import React, { useEffect } from 'react';

import { Textfield } from '@digdir/designsystemet-react';

import { useBoundValue, useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { useLanguage } from 'nextsrc/libs/form-client/react/useLanguage';
import { extractField } from 'nextsrc/libs/form-client/resolveBindings';
import { ComponentValidations } from 'nextsrc/libs/form-engine/ComponentValidations';
import classes from 'nextsrc/libs/form-engine/components/Address/Address.module.css';
import { usePostPlace } from 'nextsrc/libs/form-engine/components/shared/usePostPlace';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import type { CompAddressExternal } from 'src/layout/Address/config.generated';

export const Address = ({ component, parentBinding, itemIndex }: ComponentProps) => {
  const props = component as CompAddressExternal;
  const { langAsString } = useLanguage();
  const simplified = props.simplified !== false;

  const addressField = extractField(props.dataModelBindings?.address);
  const zipCodeField = extractField(props.dataModelBindings?.zipCode);
  const postPlaceField = extractField(props.dataModelBindings?.postPlace);
  const careOfField = extractField(props.dataModelBindings?.careOf);
  const houseNumberField = extractField(props.dataModelBindings?.houseNumber);

  const address = useBoundValue(addressField, parentBinding, itemIndex);
  const zipCode = useBoundValue(zipCodeField, parentBinding, itemIndex);
  const postPlace = useBoundValue(postPlaceField, parentBinding, itemIndex);
  const careOf = useBoundValue(careOfField, parentBinding, itemIndex);
  const houseNumber = useBoundValue(houseNumberField, parentBinding, itemIndex);

  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);

  const addressLabel = title || langAsString('address_component.address');
  const zipCodeLabel = langAsString('address_component.zip_code');
  const postPlaceLabel = langAsString('address_component.post_place');
  const careOfLabel = langAsString('address_component.care_of');
  const houseNumberLabel = langAsString('address_component.house_number');

  const zipCodeValue = typeof zipCode.value === 'string' ? zipCode.value : '';
  const postPlaceLookup = usePostPlace(zipCodeValue, true);

  useEffect(() => {
    if (postPlaceLookup && postPlaceLookup !== postPlace.value) {
      postPlace.setValue(postPlaceLookup);
    }
  }, [postPlaceLookup]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={classes.addressComponent}>
      <div>
        <Textfield
          label={addressLabel}
          id={`${props.id}_address`}
          value={String(address.value ?? '')}
          onChange={(e) => address.setValue(e.target.value)}
          readOnly={props.readOnly as boolean | undefined}
          autoComplete={simplified ? 'street-address' : 'address-line1'}
        />
        {addressField && <ComponentValidations bindingPath={addressField} />}
      </div>

      {!simplified && careOfField && (
        <div>
          <Textfield
            label={careOfLabel}
            id={`${props.id}_careOf`}
            value={String(careOf.value ?? '')}
            onChange={(e) => careOf.setValue(e.target.value)}
            readOnly={props.readOnly as boolean | undefined}
            autoComplete='address-line2'
          />
          <ComponentValidations bindingPath={careOfField} />
        </div>
      )}

      <div className={classes.zipRow}>
        <div className={classes.zipCode}>
          <Textfield
            label={zipCodeLabel}
            id={`${props.id}_zipCode`}
            value={String(zipCode.value ?? '')}
            onChange={(e) => zipCode.setValue(e.target.value)}
            readOnly={props.readOnly as boolean | undefined}
            inputMode='numeric'
            autoComplete='postal-code'
          />
          {zipCodeField && <ComponentValidations bindingPath={zipCodeField} />}
        </div>
        <div className={classes.postPlace}>
          <Textfield
            label={postPlaceLabel}
            id={`${props.id}_postPlace`}
            value={String(postPlace.value ?? '')}
            readOnly
            autoComplete='address-level1'
          />
        </div>
      </div>

      {!simplified && houseNumberField && (
        <div>
          <Textfield
            label={houseNumberLabel}
            id={`${props.id}_houseNumber`}
            value={String(houseNumber.value ?? '')}
            onChange={(e) => houseNumber.setValue(e.target.value)}
            readOnly={props.readOnly as boolean | undefined}
            autoComplete='address-line3'
          />
          <ComponentValidations bindingPath={houseNumberField} />
        </div>
      )}
    </div>
  );
};
