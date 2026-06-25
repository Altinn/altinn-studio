import type { ReactNode } from 'react';

import { Flex, Input } from '@app/form-component/app-components';
import { LabelComponent } from '@app/form-component/layout-components/common/LabelComponent';

import classes from './AddressLayout.module.css';

export type AddressFieldKey = 'address' | 'zipCode' | 'postPlace' | 'careOf' | 'houseNumber';

export interface AddressLayoutProps {
  // Content — configurable options (Studio "Innhold")
  id: string;
  simplified?: boolean;
  required?: boolean;
  readOnly?: boolean;
  showOptionalMarking?: boolean;

  // Text — text-resource-bound labels (Studio "Tekst")
  /** Text-resource key for the address label. Defaults to `address_component.address`. */
  titleKey?: string;
  /** Text-resource key for the care-of label. Defaults to `address_component.care_of`. */
  careOfTitleKey?: string;
  /** Text-resource key for the zip code label. Defaults to `address_component.zip_code`. */
  zipCodeTitleKey?: string;
  /** Text-resource key for the post place label. Defaults to `address_component.post_place`. */
  postPlaceTitleKey?: string;
  /** Text-resource key for the house number label. Defaults to `address_component.house_number`. */
  houseNumberTitleKey?: string;

  // Data — data-model-bound values (Studio "Datamodeller"), supplied by the wrapper
  address?: string;
  careOf?: string;
  zipCode?: string;
  postPlace?: string;
  houseNumber?: string;

  // Runtime — injected by the wrapper, not part of the Studio configuration
  errors?: Partial<Record<AddressFieldKey, boolean>>;
  onChange?: (field: AddressFieldKey, value: string) => void;
  onBlur?: () => void;

  // Validation message slots (rendered by the wrapper, runtime-dependent)
  addressValidation?: ReactNode;
  careOfValidation?: ReactNode;
  zipCodeValidation?: ReactNode;
  houseNumberValidation?: ReactNode;
  componentValidation?: ReactNode;
}

/**
 * Presentational address component. Fully controlled: it owns the label/input markup, the
 * simplified/full variant switch, the layout grid and aria wiring, and resolves text-resource keys
 * via `useTranslation` (through {@link LabelComponent}). The runtime wrapper supplies values, error
 * flags and the `onChange`/`onBlur` handlers, and fills the validation message slots.
 */
export function AddressLayout({
  id,
  simplified = true,
  required,
  readOnly,
  showOptionalMarking,
  titleKey,
  careOfTitleKey,
  zipCodeTitleKey,
  postPlaceTitleKey,
  houseNumberTitleKey,
  address,
  careOf,
  zipCode,
  postPlace,
  houseNumber,
  errors,
  onChange,
  onBlur,
  addressValidation,
  careOfValidation,
  zipCodeValidation,
  houseNumberValidation,
  componentValidation,
}: AddressLayoutProps) {
  const addressLabelId = `address_address_label_${id}`;
  const careOfLabelId = `address_care_of_label_${id}`;
  const zipCodeLabelId = `address_zip_code_label_${id}`;
  const postPlaceLabelId = `address_post_place_label_${id}`;
  const houseNumberLabelId = `address_house_number_label_${id}`;

  return (
    <div className={classes.addressComponent} key={`address_component_${id}`}>
      <div>
        <LabelComponent
          id={addressLabelId}
          htmlFor={`address_address_${id}`}
          title={titleKey ?? 'address_component.address'}
          required={required}
          readOnly={readOnly}
          showOptionalMarking={showOptionalMarking}
        >
          <Flex item id={`form-content-${id}-address`} size={{ xs: 12 }}>
            <Input
              id={`address_address_${id}`}
              data-bindingkey='address'
              aria-labelledby={addressLabelId}
              error={errors?.address}
              value={address}
              onChange={(ev) => onChange?.('address', ev.target.value)}
              onBlur={onBlur}
              readOnly={readOnly}
              required={required}
              autoComplete={simplified ? 'street-address' : 'address-line1'}
            />
          </Flex>
        </LabelComponent>
        {addressValidation}
      </div>

      {!simplified && (
        <div>
          <LabelComponent
            id={careOfLabelId}
            htmlFor={`address_care_of_${id}`}
            title={careOfTitleKey ?? 'address_component.care_of'}
            required={required}
            readOnly={readOnly}
            showOptionalMarking={showOptionalMarking}
          >
            <Flex item id={`form-content-${id}-care-of`} size={{ xs: 12 }}>
              <Input
                id={`address_care_of_${id}`}
                data-bindingkey='careOf'
                aria-labelledby={careOfLabelId}
                error={errors?.careOf}
                value={careOf}
                onChange={(ev) => onChange?.('careOf', ev.target.value)}
                onBlur={onBlur}
                readOnly={readOnly}
                autoComplete='address-line2'
              />
              {careOfValidation}
            </Flex>
          </LabelComponent>
        </div>
      )}

      <Flex container spacing={6}>
        <Flex
          item
          className={`${classes.addressComponentZipCode} ${classes.addressComponentSmallInputs}`}
        >
          <LabelComponent
            id={zipCodeLabelId}
            htmlFor={`address_zip_code_${id}`}
            title={zipCodeTitleKey ?? 'address_component.zip_code'}
            required={required}
            readOnly={readOnly}
            showOptionalMarking={showOptionalMarking}
          >
            <Flex item id={`form-content-${id}-zip-code`} size={{ xs: 12 }}>
              <Input
                id={`address_zip_code_${id}`}
                data-bindingkey='zipCode'
                aria-labelledby={zipCodeLabelId}
                error={errors?.zipCode}
                value={zipCode}
                onChange={(ev) => onChange?.('zipCode', ev.target.value)}
                onBlur={onBlur}
                readOnly={readOnly}
                required={required}
                inputMode='numeric'
                autoComplete='postal-code'
              />
              {zipCodeValidation}
            </Flex>
          </LabelComponent>
        </Flex>
        <Flex item className={classes.addressComponentPostplace}>
          <LabelComponent
            id={postPlaceLabelId}
            htmlFor={`address_post_place_${id}`}
            title={postPlaceTitleKey ?? 'address_component.post_place'}
            required={required}
            readOnly={readOnly}
            showOptionalMarking={showOptionalMarking}
          >
            <Flex item id={`form-content-${id}-post-place`} size={{ xs: 12 }}>
              <Input
                id={`address_post_place_${id}`}
                data-bindingkey='postPlace'
                aria-labelledby={postPlaceLabelId}
                value={postPlace}
                readOnly={true}
                required={required}
                autoComplete='address-level1'
              />
            </Flex>
          </LabelComponent>
        </Flex>
      </Flex>

      {!simplified && (
        <div>
          <LabelComponent
            id={houseNumberLabelId}
            htmlFor={`address_house_number_${id}`}
            title={houseNumberTitleKey ?? 'address_component.house_number'}
            help='address_component.house_number_helper'
            required={required}
            readOnly={readOnly}
            showOptionalMarking={showOptionalMarking}
          >
            <Flex item id={`form-content-${id}-house-number`} size={{ xs: 12 }}>
              <div className={classes.addressComponentSmallInputs}>
                <Input
                  id={`address_house_number_${id}`}
                  data-bindingkey='houseNumber'
                  aria-labelledby={houseNumberLabelId}
                  error={errors?.houseNumber}
                  value={houseNumber}
                  onChange={(ev) => onChange?.('houseNumber', ev.target.value)}
                  onBlur={onBlur}
                  readOnly={readOnly}
                  autoComplete='address-line3'
                />
              </div>
            </Flex>
          </LabelComponent>
          {houseNumberValidation}
        </div>
      )}
      {componentValidation}
    </div>
  );
}
