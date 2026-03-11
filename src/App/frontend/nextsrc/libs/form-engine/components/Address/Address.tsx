import React, { useEffect } from 'react';

import { Textfield } from '@digdir/designsystemet-react';
import { usePostPlace } from 'nextsrc/core/queries/postalCodes';
import { useComponentBinding, useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { useLanguage } from 'nextsrc/libs/form-client/react/useLanguage';
import classes from 'nextsrc/libs/form-engine/components/Address/Address.module.css';
import { ComponentValidations } from 'nextsrc/libs/form-engine/ComponentValidations';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import type { CompAddressExternal } from 'src/layout/Address/config.generated';

export const Address = ({ component, parentBinding, itemIndex }: ComponentProps) => {
  const props = component as CompAddressExternal;
  const { langAsString } = useLanguage();
  const simplified = props.simplified !== false;

  const address = useComponentBinding(props.dataModelBindings?.address, parentBinding, itemIndex);
  const zipCode = useComponentBinding(props.dataModelBindings?.zipCode, parentBinding, itemIndex);
  const postPlace = useComponentBinding(props.dataModelBindings?.postPlace, parentBinding, itemIndex);
  const careOf = useComponentBinding(props.dataModelBindings?.careOf, parentBinding, itemIndex);
  const houseNumber = useComponentBinding(props.dataModelBindings?.houseNumber, parentBinding, itemIndex);

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
        {address.field && <ComponentValidations bindingPath={address.field} />}
      </div>

      {!simplified && careOf.field && (
        <div>
          <Textfield
            label={careOfLabel}
            id={`${props.id}_careOf`}
            value={String(careOf.value ?? '')}
            onChange={(e) => careOf.setValue(e.target.value)}
            readOnly={props.readOnly as boolean | undefined}
            autoComplete='address-line2'
          />
          <ComponentValidations bindingPath={careOf.field} />
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
          {zipCode.field && <ComponentValidations bindingPath={zipCode.field} />}
        </div>
        <div className={classes.postPlace}>
          <Textfield
            label={postPlaceLabel}
            id={`${props.id}_postPlace`}
            value={String(postPlace.value ?? '')}
            readOnly
            autoComplete='address-level1'
          />
          {postPlace.field && <ComponentValidations bindingPath={postPlace.field} />}
        </div>
      </div>

      {!simplified && houseNumber.field && (
        <div>
          <Textfield
            label={houseNumberLabel}
            id={`${props.id}_houseNumber`}
            value={String(houseNumber.value ?? '')}
            onChange={(e) => houseNumber.setValue(e.target.value)}
            readOnly={props.readOnly as boolean | undefined}
            autoComplete='address-line3'
          />
          <ComponentValidations bindingPath={houseNumber.field} />
        </div>
      )}
    </div>
  );
};
