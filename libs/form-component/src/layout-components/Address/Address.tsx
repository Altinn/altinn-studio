import { type ReactElement, type ReactNode } from 'react';

// this eslint-disables will be fixed once this PR is merged:
// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { Flex, HelpText, Input, Label } from '../../app-components';
// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { useTranslation } from '../../LanguageTranslatorProvider';
import classes from './Address.module.css';

/**
 * Props that map 1:1 to the component's Studio-configurable options. These are the props an app
 * developer documents and experiments with in Storybook — see {@link ADDRESS_CONFIG_KEYS}.
 */
export interface AddressConfig {
  /** The component id. */
  id: string;
  /** Text-resource key for the street address label. Defaults to `address_component.address`. */
  title?: string;
  /** Text-resource key for the care-of label. Defaults to `address_component.care_of`. */
  careOfTitle?: string;
  /** Text-resource key for the zip code label. Defaults to `address_component.zip_code`. */
  zipCodeTitle?: string;
  /** Text-resource key for the post place label. Defaults to `address_component.post_place`. */
  postPlaceTitle?: string;
  /** Text-resource key for the house number label. Defaults to `address_component.house_number`. */
  houseNumberTitle?: string;
  /** Whether the fields are required. */
  required?: boolean;
  /** Whether the fields are read-only. */
  readOnly?: boolean;
  /** When true, only the address, zip code and post place fields are shown. */
  simplified?: boolean;
  /** Whether to render an "(optional)" marking when the fields are not required. */
  showOptionalMarking?: boolean;
}

/**
 * Internal wiring supplied by the runtime wrapper: the field values, validation state, event
 * handlers and the per-field validation message slots. These are intentionally NOT part of the
 * Studio configuration and are hidden from the Storybook controls (only {@link ADDRESS_CONFIG_KEYS}
 * are shown).
 */
export interface AddressControlProps {
  /** The current street address value. */
  address?: string;
  /** The current care-of value. */
  careOf?: string;
  /** The current zip code value. */
  zipCode?: string;
  /** The current post place value. Always read-only; derived from the zip code at runtime. */
  postPlace?: string;
  /** The current house number value. */
  houseNumber?: string;
  /** Whether the street address field is in an error state. */
  addressError?: boolean;
  /** Whether the care-of field is in an error state. */
  careOfError?: boolean;
  /** Whether the zip code field is in an error state. */
  zipCodeError?: boolean;
  /** Whether the house number field is in an error state. */
  houseNumberError?: boolean;
  /** Called with the new street address value. */
  onAddressChange?: (value: string) => void;
  /** Called with the new care-of value. */
  onCareOfChange?: (value: string) => void;
  /** Called with the new zip code value. */
  onZipCodeChange?: (value: string) => void;
  /** Called with the new house number value. */
  onHouseNumberChange?: (value: string) => void;
  /** Blur handler shared by the editable fields. */
  onBlur?: () => void;
  /** Validation messages rendered beneath the street address field. */
  addressValidations?: ReactNode;
  /** Validation messages rendered beneath the care-of field. */
  careOfValidations?: ReactNode;
  /** Validation messages rendered beneath the zip code field. */
  zipCodeValidations?: ReactNode;
  /** Validation messages rendered beneath the house number field. */
  houseNumberValidations?: ReactNode;
  /** Component-level validation messages rendered at the bottom of the component. */
  componentValidations?: ReactNode;
  /**
   * Overrides the required marking shown on each label. The runtime wrapper supplies a markdown-safe
   * indicator here (the `*` resource cannot be rendered through the markdown-parsing translator). When
   * omitted, a translated default is built for Storybook/standalone use.
   */
  requiredIndicator?: ReactElement;
  /**
   * Overrides the optional marking shown on each label. The runtime wrapper supplies an indicator that
   * already encodes the read-only / showOptionalMarking logic. When omitted, a translated default is
   * built from {@link AddressConfig.showOptionalMarking} for Storybook/standalone use.
   */
  optionalIndicator?: ReactElement;
}

export interface AddressProps extends AddressConfig, AddressControlProps {}

/**
 * The configurable props, derived from {@link AddressConfig}. The `satisfies Record<...>` keeps this
 * list exhaustive: adding a prop to `AddressConfig` without listing it here is a compile error.
 * Storybook uses it (`controls.include`) to show controls for exactly the configurable props and
 * nothing else.
 */
export const ADDRESS_CONFIG_KEYS = Object.keys({
  id: true,
  title: true,
  careOfTitle: true,
  zipCodeTitle: true,
  postPlaceTitle: true,
  houseNumberTitle: true,
  required: true,
  readOnly: true,
  simplified: true,
  showOptionalMarking: true,
} satisfies Record<keyof AddressConfig, true>) as (keyof AddressConfig)[];

export function Address(props: AddressProps) {
  const {
    id,
    title,
    careOfTitle,
    zipCodeTitle,
    postPlaceTitle,
    houseNumberTitle,
    required,
    readOnly,
    simplified = true,
    showOptionalMarking,
    address,
    careOf,
    zipCode,
    postPlace,
    houseNumber,
    addressError,
    careOfError,
    zipCodeError,
    houseNumberError,
    onAddressChange,
    onCareOfChange,
    onZipCodeChange,
    onHouseNumberChange,
    onBlur,
    addressValidations,
    careOfValidations,
    zipCodeValidations,
    houseNumberValidations,
    componentValidations,
    requiredIndicator: requiredIndicatorOverride,
    optionalIndicator: optionalIndicatorOverride,
  } = props;

  const { translate, TranslateComponent } = useTranslation();

  // The required/optional markings depend only on the component-level flags, so they are identical
  // for every field's label. The runtime wrapper overrides them with markdown-safe indicators; the
  // translated defaults below are only used in Storybook / standalone rendering.
  const requiredIndicator: ReactElement | undefined =
    requiredIndicatorOverride !== undefined ? (
      requiredIndicatorOverride
    ) : required ? (
      <span> {translate('form_filler.required_label')}</span>
    ) : undefined;

  const optionalIndicator: ReactElement | undefined =
    optionalIndicatorOverride !== undefined ? (
      optionalIndicatorOverride
    ) : !required && showOptionalMarking && !readOnly ? (
      <span className={classes.optionalIndicator}>{` (${translate('general.optional')})`}</span>
    ) : undefined;

  const houseNumberLabel = translate(houseNumberTitle ?? 'address_component.house_number');

  return (
    <div className={classes.addressComponent}>
      <div>
        <Label
          id={`address_address_label_${id}`}
          htmlFor={`address_address_${id}`}
          label={translate(title ?? 'address_component.address')}
          required={required}
          requiredIndicator={requiredIndicator}
          optionalIndicator={optionalIndicator}
        >
          <Flex item id={`form-content-${id}-address`} size={{ xs: 12 }}>
            <Input
              id={`address_address_${id}`}
              data-bindingkey='address'
              aria-labelledby={`address_address_label_${id}`}
              error={addressError}
              value={address}
              onChange={(ev) => onAddressChange?.(ev.target.value)}
              onBlur={onBlur}
              readOnly={readOnly}
              required={required}
              autoComplete={simplified ? 'street-address' : 'address-line1'}
            />
          </Flex>
        </Label>
        {addressValidations}
      </div>

      {!simplified && (
        <div>
          <Label
            id={`address_care_of_label_${id}`}
            htmlFor={`address_care_of_${id}`}
            label={translate(careOfTitle ?? 'address_component.care_of')}
            required={required}
            requiredIndicator={requiredIndicator}
            optionalIndicator={optionalIndicator}
          >
            <Flex item id={`form-content-${id}-care-of`} size={{ xs: 12 }}>
              <Input
                id={`address_care_of_${id}`}
                data-bindingkey='careOf'
                aria-labelledby={`address_care_of_label_${id}`}
                error={careOfError}
                value={careOf}
                onChange={(ev) => onCareOfChange?.(ev.target.value)}
                onBlur={onBlur}
                readOnly={readOnly}
                autoComplete='address-line2'
              />
              {careOfValidations}
            </Flex>
          </Label>
        </div>
      )}

      <Flex container spacing={6}>
        <Flex
          item
          className={`${classes.addressComponentZipCode} ${classes.addressComponentSmallInputs}`}
        >
          <Label
            id={`address_zip_code_label_${id}`}
            htmlFor={`address_zip_code_${id}`}
            label={translate(zipCodeTitle ?? 'address_component.zip_code')}
            required={required}
            requiredIndicator={requiredIndicator}
            optionalIndicator={optionalIndicator}
          >
            <Flex item id={`form-content-${id}-zip-code`} size={{ xs: 12 }}>
              <Input
                id={`address_zip_code_${id}`}
                data-bindingkey='zipCode'
                aria-labelledby={`address_zip_code_label_${id}`}
                error={zipCodeError}
                value={zipCode}
                onChange={(ev) => onZipCodeChange?.(ev.target.value)}
                onBlur={onBlur}
                readOnly={readOnly}
                required={required}
                inputMode='numeric'
                autoComplete='postal-code'
              />
              {zipCodeValidations}
            </Flex>
          </Label>
        </Flex>
        <Flex item className={classes.addressComponentPostplace}>
          <Label
            id={`address_post_place_label_${id}`}
            htmlFor={`address_post_place_${id}`}
            label={translate(postPlaceTitle ?? 'address_component.post_place')}
            required={required}
            requiredIndicator={requiredIndicator}
            optionalIndicator={optionalIndicator}
          >
            <Flex item id={`form-content-${id}-post-place`} size={{ xs: 12 }}>
              <Input
                id={`address_post_place_${id}`}
                data-bindingkey='postPlace'
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
            label={houseNumberLabel}
            required={required}
            requiredIndicator={requiredIndicator}
            optionalIndicator={optionalIndicator}
            help={
              <HelpText
                id={`${id}-helptext`}
                titlePrefix={translate('helptext.button_title_prefix')}
                title={houseNumberLabel}
                className={classes.helpTextContainer}
              >
                <TranslateComponent tKey='address_component.house_number_helper' />
              </HelpText>
            }
          >
            <Flex item id={`form-content-${id}-house-number`} size={{ xs: 12 }}>
              <div className={classes.addressComponentSmallInputs}>
                <Input
                  id={`address_house_number_${id}`}
                  data-bindingkey='houseNumber'
                  aria-labelledby={`address_house_number_label_${id}`}
                  error={houseNumberError}
                  value={houseNumber}
                  onChange={(ev) => onHouseNumberChange?.(ev.target.value)}
                  onBlur={onBlur}
                  readOnly={readOnly}
                  autoComplete='address-line3'
                />
              </div>
            </Flex>
          </Label>
          {houseNumberValidations}
        </div>
      )}
      {componentValidations}
    </div>
  );
}
