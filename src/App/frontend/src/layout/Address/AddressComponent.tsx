import React, { useEffect } from 'react';

import { AddressLayout } from '@app/form-component';
import type { AddressFieldKey } from '@app/form-component';

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

  const updatePostPlace = useOurEffectEvent((newPostPlace: string) => {
    if (newPostPlace != null && newPostPlace !== postPlace && !readOnly) {
      setValue('postPlace', newPostPlace);
    }
  });

  const zipCodeDebounced = FormStore.data.useDebouncedPick(dataModelBindings.zipCode);
  const slowZip = typeof zipCodeDebounced === 'string' ? zipCodeDebounced : undefined;
  const postPlaceQueryData = usePostPlace(slowZip, !hasValidationErrors(bindingValidations?.zipCode) && !readOnly);
  useEffect(() => updatePostPlace(postPlaceQueryData), [postPlaceQueryData, updatePostPlace]);

  const handleChange = (field: AddressFieldKey, value: string) => {
    setValue(field, value);
  };

  const handleBlur = () => {
    debounce('blur');
  };

  return (
    <AddressLayout
      id={id}
      simplified={simplified}
      required={required}
      readOnly={readOnly}
      showOptionalMarking={!!labelSettings?.optionalIndicator}
      title={textResourceBindings?.title}
      careOfTitle={textResourceBindings?.careOfTitle}
      zipCodeTitle={textResourceBindings?.zipCodeTitle}
      postPlaceTitle={textResourceBindings?.postPlaceTitle}
      houseNumberTitle={textResourceBindings?.houseNumberTitle}
      address={address}
      careOf={careOf}
      zipCode={zipCode}
      postPlace={postPlace}
      houseNumber={houseNumber}
      errors={{
        address: hasValidationErrors(bindingValidations?.address),
        zipCode: hasValidationErrors(bindingValidations?.zipCode),
        careOf: hasValidationErrors(bindingValidations?.careOf),
        houseNumber: hasValidationErrors(bindingValidations?.houseNumber),
      }}
      onChange={handleChange}
      onBlur={handleBlur}
      addressValidation={
        <ComponentValidations
          validations={bindingValidations?.address}
          baseComponentId={baseComponentId}
        />
      }
      careOfValidation={
        <ComponentValidations
          validations={bindingValidations?.careOf}
          baseComponentId={baseComponentId}
        />
      }
      zipCodeValidation={
        <ComponentValidations
          validations={bindingValidations?.zipCode}
          baseComponentId={baseComponentId}
        />
      }
      houseNumberValidation={
        <ComponentValidations
          validations={bindingValidations?.houseNumber}
          baseComponentId={baseComponentId}
        />
      }
      componentValidation={
        <ComponentValidations
          validations={componentValidations}
          baseComponentId={baseComponentId}
        />
      }
    />
  );
}
