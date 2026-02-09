import React, { useEffect } from 'react';

import { Flex } from 'src/app-components/Flex/Flex';
import { Input } from 'src/app-components/Input/Input';
import { Label } from 'src/app-components/Label/Label';
import { HelpTextContainer } from 'src/components/form/HelpTextContainer';
import { OptionalIndicator } from 'src/components/form/OptionalIndicator';
import { RequiredIndicator } from 'src/components/form/RequiredIndicator';
import { FD } from 'src/features/formData/FormDataWrite';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { ComponentValidations } from 'src/features/validation/ComponentValidations';
import { useBindingValidationsFor } from 'src/features/validation/selectors/bindingValidationsForNode';
import { useComponentValidationsFor } from 'src/features/validation/selectors/componentValidationsForNode';
import { hasValidationErrors } from 'src/features/validation/utils';
import { useOurEffectEvent } from 'src/hooks/useOurEffectEvent';
import classes from 'src/layout/Address/AddressComponent.module.css';
import { usePostPlace } from 'src/layout/Address/usePostPlace';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IDataModelBindingsForAddress } from 'src/layout/Address/config.generated';

const bindingKeys: { [k in keyof IDataModelBindingsForAddress]: k } = {
  address: 'address',
  postPlace: 'postPlace',
  zipCode: 'zipCode',
  houseNumber: 'houseNumber',
  careOf: 'careOf',
};

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
  const { langAsString } = useLanguage();

  const bindingValidations = useBindingValidationsFor<'Address'>(baseComponentId);
  const componentValidations = useComponentValidationsFor(baseComponentId);
  const { formData, setValue } = useDataModelBindings(dataModelBindings, saveWhileTyping);
  const debounce = FD.useDebounceImmediately();
  const { address, careOf, postPlace, zipCode, houseNumber } = formData;

  const updatePostPlace = useOurEffectEvent((newPostPlace) => {
    if (newPostPlace != null && newPostPlace != postPlace && !readOnly) {
      setValue('postPlace', newPostPlace);
    }
  });

  const zipCodeDebounced = FD.useDebouncedPick(dataModelBindings.zipCode);
  const slowZip = typeof zipCodeDebounced === 'string' ? zipCodeDebounced : undefined;
  const postPlaceQueryData = usePostPlace(slowZip, !hasValidationErrors(bindingValidations?.zipCode) && !readOnly);
  useEffect(() => updatePostPlace(postPlaceQueryData), [postPlaceQueryData, updatePostPlace]);

  return (
    <div
      className={classes.addressComponent}
      key={`address_component_${id}`}
    >
      <div>
        <Label
          id={`address_address_label_${id}`}
          htmlFor={`address_address_${id}`}
          label={langAsString(textResourceBindings?.title ?? 'address_component.address')}
          required={required}
          requiredIndicator={<RequiredIndicator required={required} />}
          optionalIndicator={
            <OptionalIndicator
              readOnly={readOnly}
              required={required}
              showOptionalMarking={!!labelSettings?.optionalIndicator}
            />
          }
        >
          <Flex
            item
            id={`form-content-${id}-address`}
            size={{ xs: 12 }}
          >
            <Input
              id={`address_address_${id}`}
              data-bindingkey={bindingKeys.address}
              aria-labelledby={`address_address_label_${id}`}
              error={hasValidationErrors(bindingValidations?.address)}
              value={address}
              onChange={(ev) => setValue('address', ev.target.value)}
              onBlur={() => debounce('blur')}
              readOnly={readOnly}
              required={required}
              autoComplete={simplified ? 'street-address' : 'address-line1'}
            />
          </Flex>
        </Label>
        <ComponentValidations
          validations={bindingValidations?.address}
          baseComponentId={baseComponentId}
        />
      </div>

      {!simplified && (
        <div>
          <Label
            id={`address_care_of_label_${id}`}
            htmlFor={`address_care_of_${id}`}
            label={langAsString(textResourceBindings?.careOfTitle ?? 'address_component.care_of')}
            required={required}
            requiredIndicator={<RequiredIndicator required={required} />}
            optionalIndicator={
              <OptionalIndicator
                readOnly={readOnly}
                required={required}
                showOptionalMarking={!!labelSettings?.optionalIndicator}
              />
            }
          >
            <Flex
              item
              id={`form-content-${id}-care-of`}
              size={{ xs: 12 }}
            >
              <Input
                id={`address_care_of_${id}`}
                data-bindingkey={bindingKeys.careOf}
                aria-labelledby={`address_care_of_label_${id}`}
                error={hasValidationErrors(bindingValidations?.careOf)}
                value={careOf}
                onChange={(ev) => setValue('careOf', ev.target.value)}
                onBlur={() => debounce('blur')}
                readOnly={readOnly}
                autoComplete='address-line2'
              />
              <ComponentValidations
                validations={bindingValidations?.careOf}
                baseComponentId={baseComponentId}
              />
            </Flex>
          </Label>
        </div>
      )}

      <Flex
        container
        spacing={6}
      >
        <Flex
          item
          className={`${classes.addressComponentZipCode} ${classes.addressComponentSmallInputs}`}
        >
          <Label
            id={`address_zip_code_label_${id}`}
            htmlFor={`address_zip_code_${id}`}
            label={langAsString(textResourceBindings?.zipCodeTitle ?? 'address_component.zip_code')}
            required={required}
            requiredIndicator={<RequiredIndicator required={required} />}
            optionalIndicator={
              <OptionalIndicator
                readOnly={readOnly}
                required={required}
                showOptionalMarking={!!labelSettings?.optionalIndicator}
              />
            }
          >
            <Flex
              item
              id={`form-content-${id}-zip-code`}
              size={{ xs: 12 }}
            >
              <Input
                id={`address_zip_code_${id}`}
                data-bindingkey={bindingKeys.zipCode}
                aria-labelledby={`address_zip_code_label_${id}`}
                error={hasValidationErrors(bindingValidations?.zipCode)}
                value={zipCode}
                onChange={(ev) => setValue('zipCode', ev.target.value)}
                onBlur={() => debounce('blur')}
                readOnly={readOnly}
                required={required}
                inputMode='numeric'
                autoComplete='postal-code'
              />
              <ComponentValidations
                validations={bindingValidations?.zipCode}
                baseComponentId={baseComponentId}
              />
            </Flex>
          </Label>
        </Flex>
        <Flex
          item
          className={classes.addressComponentPostplace}
        >
          <Label
            id={`address_post_place_label_${id}`}
            htmlFor={`address_post_place_${id}`}
            label={langAsString(textResourceBindings?.postPlaceTitle ?? 'address_component.post_place')}
            required={required}
            requiredIndicator={<RequiredIndicator required={required} />}
            optionalIndicator={
              <OptionalIndicator
                readOnly={readOnly}
                required={required}
                showOptionalMarking={!!labelSettings?.optionalIndicator}
              />
            }
          >
            <Flex
              item
              id={`form-content-${id}-post-place`}
              size={{ xs: 12 }}
            >
              <Input
                id={`address_post_place_${id}`}
                data-bindingkey={bindingKeys.postPlace}
                aria-labelledby={`address_post_place_label_${id}`}
                value={postPlace}
                readOnly={true}
                required={required}
                autoComplete='address-level1'
              />
            </Flex>
          </Label>
        </Flex>
      </Flex>

      {!simplified && (
        <div>
          <Label
            id={`address_house_number_label_${id}`}
            htmlFor={`address_house_number_${id}`}
            required={required}
            label={langAsString(textResourceBindings?.houseNumberTitle ?? 'address_component.house_number')}
            requiredIndicator={<RequiredIndicator required={required} />}
            optionalIndicator={
              <OptionalIndicator
                readOnly={readOnly}
                required={required}
                showOptionalMarking={!!labelSettings?.optionalIndicator}
              />
            }
            help={
              <HelpTextContainer
                id={id}
                title={langAsString(textResourceBindings?.houseNumberTitle ?? 'address_component.house_number')}
                helpText={<Lang id='address_component.house_number_helper' />}
              />
            }
          >
            <Flex
              item
              id={`form-content-${id}-house-number`}
              size={{ xs: 12 }}
            >
              <div className={classes.addressComponentSmallInputs}>
                <Input
                  id={`address_house_number_${id}`}
                  data-bindingkey={bindingKeys.houseNumber}
                  aria-labelledby={`address_house_number_label_${id}`}
                  error={hasValidationErrors(bindingValidations?.houseNumber)}
                  value={houseNumber}
                  onChange={(ev) => setValue('houseNumber', ev.target.value)}
                  onBlur={() => debounce('blur')}
                  readOnly={readOnly}
                  autoComplete='address-line3'
                />
              </div>
            </Flex>
          </Label>
          <ComponentValidations
            validations={bindingValidations?.houseNumber}
            baseComponentId={baseComponentId}
          />
        </div>
      )}
      <ComponentValidations
        validations={componentValidations}
        baseComponentId={baseComponentId}
      />
    </div>
  );
}
