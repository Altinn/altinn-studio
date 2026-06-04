import React, { useEffect } from 'react';

import { Address } from '@app/form-component';

import { OptionalIndicator } from 'src/components/form/OptionalIndicator';
import { RequiredIndicator } from 'src/components/form/RequiredIndicator';
import { FormStore } from 'src/features/form/FormContext';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { ComponentValidations } from 'src/features/validation/ComponentValidations';
import { useBindingValidationsFor } from 'src/features/validation/selectors/bindingValidationsForNode';
import { useComponentValidationsFor } from 'src/features/validation/selectors/componentValidationsForNode';
import { hasValidationErrors } from 'src/features/validation/utils';
import { useOurEffectEvent } from 'src/hooks/useOurEffectEvent';
import { usePostPlace } from 'src/layout/Address/usePostPlace';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export function AddressComponent({ baseComponentId }: PropsFromGenericComponent<'Address'>) {
  const {
    id,
    required,
    readOnly,
    simplified,
    saveWhileTyping,
    textResourceBindings,
    dataModelBindings,
    labelSettings,
  } = useItemWhenType(baseComponentId, 'Address');

  const bindingValidations = useBindingValidationsFor<'Address'>(baseComponentId);
  const componentValidations = useComponentValidationsFor(baseComponentId);
  const { formData, setValue } = useDataModelBindings(dataModelBindings, saveWhileTyping);
  const debounce = FormStore.data.useDebounceImmediately();
  const { address, careOf, postPlace, zipCode, houseNumber } = formData;

  const updatePostPlace = useOurEffectEvent((newPostPlace) => {
    if (newPostPlace != null && newPostPlace != postPlace && !readOnly) {
      setValue('postPlace', newPostPlace);
    }
  });

  const zipCodeDebounced = FormStore.data.useDebouncedPick(dataModelBindings.zipCode);
  const slowZip = typeof zipCodeDebounced === 'string' ? zipCodeDebounced : undefined;
  const postPlaceQueryData = usePostPlace(slowZip, !hasValidationErrors(bindingValidations?.zipCode) && !readOnly);
  useEffect(() => updatePostPlace(postPlaceQueryData), [postPlaceQueryData, updatePostPlace]);

  return (
    <Address
      id={id}
      title={textResourceBindings?.title}
      careOfTitle={textResourceBindings?.careOfTitle}
      zipCodeTitle={textResourceBindings?.zipCodeTitle}
      postPlaceTitle={textResourceBindings?.postPlaceTitle}
      houseNumberTitle={textResourceBindings?.houseNumberTitle}
      required={required}
      readOnly={readOnly}
      simplified={simplified}
      showOptionalMarking={!!labelSettings?.optionalIndicator}
      requiredIndicator={<RequiredIndicator required={required} />}
      optionalIndicator={
        <OptionalIndicator
          readOnly={readOnly}
          required={required}
          showOptionalMarking={!!labelSettings?.optionalIndicator}
        />
      }
      address={address}
      careOf={careOf}
      zipCode={zipCode}
      postPlace={postPlace}
      houseNumber={houseNumber}
      addressError={hasValidationErrors(bindingValidations?.address)}
      careOfError={hasValidationErrors(bindingValidations?.careOf)}
      zipCodeError={hasValidationErrors(bindingValidations?.zipCode)}
      houseNumberError={hasValidationErrors(bindingValidations?.houseNumber)}
      onAddressChange={(value) => setValue('address', value)}
      onCareOfChange={(value) => setValue('careOf', value)}
      onZipCodeChange={(value) => setValue('zipCode', value)}
      onHouseNumberChange={(value) => setValue('houseNumber', value)}
      onBlur={() => debounce('blur')}
      addressValidations={
        <ComponentValidations
          validations={bindingValidations?.address}
          baseComponentId={baseComponentId}
        />
      }
      careOfValidations={
        <ComponentValidations
          validations={bindingValidations?.careOf}
          baseComponentId={baseComponentId}
        />
      }
      zipCodeValidations={
        <ComponentValidations
          validations={bindingValidations?.zipCode}
          baseComponentId={baseComponentId}
        />
      }
      houseNumberValidations={
        <ComponentValidations
          validations={bindingValidations?.houseNumber}
          baseComponentId={baseComponentId}
        />
      }
      componentValidations={
        <ComponentValidations
          validations={componentValidations}
          baseComponentId={baseComponentId}
        />
      }
    />
  );
}
