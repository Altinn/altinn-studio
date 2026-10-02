import React, { useEffect } from 'react';

import { AddressLayout } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import type { AddressFieldKey } from '@app/form-component';

import { FormStore } from 'src/features/form/FormContext';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { ComponentValidations } from 'src/features/validation/ComponentValidations';
import { useBindingValidationsFor } from 'src/features/validation/selectors/bindingValidationsForNode';
import { useComponentValidationsFor } from 'src/features/validation/selectors/componentValidationsForNode';
import { hasValidationErrors } from 'src/features/validation/utils';
import { useOurEffectEvent } from 'src/hooks/useOurEffectEvent';
import { usePostPlace } from 'src/layout/Address/usePostPlace';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useEvalExpression, useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';

export function AddressComponent({ baseComponentId }: PropsFromGenericComponent<'Address'>) {
  const config = useComponentConfig(baseComponentId, 'Address');
  const dataModelBindings = useDataModelBindingsFor(baseComponentId, 'Address');
  const componentId = useIndexedId(baseComponentId);
  const required = useEvalExpression(config.required, Expressions.Address.required);
  const readOnly = useEvalExpression(config.readOnly, Expressions.Address.readOnly);
  const title = useEvalOptionalText(config.textResourceBindings?.title, Expressions.Address.textResourceBindings.title);
  const careOfTitle = useEvalOptionalText(
    config.textResourceBindings?.careOfTitle,
    Expressions.Address.textResourceBindings.careOfTitle,
  );
  const zipCodeTitle = useEvalOptionalText(
    config.textResourceBindings?.zipCodeTitle,
    Expressions.Address.textResourceBindings.zipCodeTitle,
  );
  const postPlaceTitle = useEvalOptionalText(
    config.textResourceBindings?.postPlaceTitle,
    Expressions.Address.textResourceBindings.postPlaceTitle,
  );
  const houseNumberTitle = useEvalOptionalText(
    config.textResourceBindings?.houseNumberTitle,
    Expressions.Address.textResourceBindings.houseNumberTitle,
  );

  const bindingValidations = useBindingValidationsFor<'Address'>(baseComponentId);
  const componentValidations = useComponentValidationsFor(baseComponentId);
  const { formData, setValue } = useDataModelBindings(dataModelBindings, config.saveWhileTyping);
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
      id={componentId}
      simplified={config.simplified}
      required={required}
      readOnly={readOnly}
      showOptionalMarking={!!config.labelSettings?.optionalIndicator}
      title={title}
      careOfTitle={careOfTitle}
      zipCodeTitle={zipCodeTitle}
      postPlaceTitle={postPlaceTitle}
      houseNumberTitle={houseNumberTitle}
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
