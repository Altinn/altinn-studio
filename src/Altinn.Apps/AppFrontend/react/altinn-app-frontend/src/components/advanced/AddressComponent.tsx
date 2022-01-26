import * as React from 'react';
import axios from 'axios';
import cn from 'classnames';

import type { IComponentValidations, ILabelSettings } from 'src/types';
import type { IComponentProps } from '..';
import { getLanguageFromKey, get } from 'altinn-shared/utils';
import { renderValidationMessagesForComponent } from '../../utils/render';
import { AddressLabel } from './AddressLabel';

import '../../styles/shared.css';
import './AddressComponent.css';

export interface IAddressComponentProps extends IComponentProps {
  simplified: boolean;
  labelSettings?: ILabelSettings;
}

export enum AddressKeys {
  address = 'address',
  zipCode = 'zipCode',
  postPlace = 'postPlace',
  careOf = 'careOf',
  houseNumber = 'houseNumber',
}

const fetchPostPlace = async (zipCode: string) => {
  try {
    const response = await get(
      'https://api.bring.com/shippingguide/api/postalCode.json',
      {
        params: {
          clientUrl: window.location.href,
          pnr: zipCode,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    return {
      isValid: response.valid,
      postPlace: response.result,
    };
  } catch (err) {
    if (axios.isCancel(err)) {
      // Intentionally ignored
    } else {
      console.error(err);
    }
  }
};

export function AddressComponent({
  formData,
  language,
  handleDataChange,
  componentValidations,
  id,
  required,
  readOnly,
  labelSettings,
  simplified,
}: IAddressComponentProps) {
  const [address, setAddress] = React.useState(formData.address || '');
  const [zipCode, setZipCode] = React.useState(formData.zipCode || '');
  const [postPlace, setPostPlace] = React.useState(formData.postPlace || '');
  const [careOf, setCareOf] = React.useState(formData.careOf || '');
  const [houseNumber, setHouseNumber] = React.useState(
    formData.houseNumber || '',
  );
  const [validations, setValidations] = React.useState({} as any);

  React.useEffect(() => {
    setAddress(formData.address || '');
    setZipCode(formData.zipCode || '');
    setPostPlace(formData.postPlace || '');
    setCareOf(formData.careOf || '');
    setHouseNumber(formData.houseNumber || '');
  }, [
    formData.zipCode,
    formData.postPlace,
    formData.address,
    formData.careOf,
    formData.houseNumber,
  ]);

  const handleBlurHouseNumber = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newHouseNumber = event.target.value;
    let error = null;

    if (
      newHouseNumber &&
      !newHouseNumber.match(new RegExp('^[a-z,A-Z]{1}[0-9]{4}$'))
    ) {
      error = getLanguageFromKey(
        'address_component.validation_error_house_number',
        language,
      );
    } else {
      handleDataChange(event.target.value, AddressKeys.houseNumber);
    }
    setValidations({ ...validations, houseNumber: error });
  };

  const handleBlurZipCode = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newValue = event.target.value;
    const inputIs4Digits = newValue.match(new RegExp('^[0-9]{4}$'));
    let hasError = true;

    if (newValue === '') {
      handleDataChange('', AddressKeys.zipCode);
      handleDataChange('', AddressKeys.postPlace);
      hasError = false;
    } else if (inputIs4Digits) {
      const { isValid, postPlace: newPostPlace } = await fetchPostPlace(
        newValue,
      );

      if (isValid) {
        handleDataChange(newValue, AddressKeys.zipCode);
        handleDataChange(newPostPlace, AddressKeys.postPlace);
        setPostPlace(newPostPlace);
        hasError = false;
      }
    }

    if (hasError) {
      setPostPlace('');

      const error = getLanguageFromKey(
        'address_component.validation_error_zipcode',
        language,
      );
      setValidations({ ...validations, zipCode: error });
    } else {
      setValidations({ ...validations, zipCode: null });
    }
  };

  const joinValidationMessages = (): IComponentValidations => {
    let validationMessages = componentValidations;
    if (!validationMessages) {
      validationMessages = {};
    }

    Object.keys(AddressKeys).forEach((fieldKey: string) => {
      if (!validationMessages[fieldKey]) {
        validationMessages = {
          ...validationMessages,
          [fieldKey]: {
            errors: [],
            warnings: [],
          },
        };
      }
    });

    Object.keys(validations).forEach((fieldKey: string) => {
      if (validations[fieldKey]) {
        if (validationMessages[fieldKey]) {
          const validationMessage = validations[fieldKey];
          const match =
            validationMessages[fieldKey].errors.indexOf(validationMessage) > -1;
          if (!match) {
            validationMessages[fieldKey].errors.push(validations[fieldKey]);
          }
        } else {
          validationMessages = {
            ...validationMessages,
            [fieldKey]: {
              errors: [],
              warnings: [],
            },
          };
          validationMessages[fieldKey].errors = [validations[fieldKey]];
        }
      }
    });

    return validationMessages;
  };

  const allValidations = joinValidationMessages();

  return (
    <div className='address-component' key={`address_component_${id}`}>
      <AddressLabel
        labelKey={'address_component.address'}
        id={`address_address_${id}`}
        language={language}
        required={required}
        readOnly={readOnly}
        labelSettings={labelSettings}
      />
      <input
        id={`address_address_${id}`}
        className={cn('form-control', {
          'validation-error': allValidations.address.errors.length,
          disabled: readOnly,
        })}
        value={address}
        onChange={(event) => setAddress(event.target.value)}
        onBlur={(event) =>
          handleDataChange(event.target.value, AddressKeys.address)
        }
        readOnly={readOnly}
        required={required}
      />
      {allValidations?.[AddressKeys.address]
        ? renderValidationMessagesForComponent(
            allValidations[AddressKeys.address],
            `${id}_${AddressKeys.address}`,
          )
        : null}
      {!simplified && (
        <>
          <AddressLabel
            labelKey={'address_component.care_of'}
            id={`address_care_of_${id}`}
            language={language}
            required={required}
            readOnly={readOnly}
            labelSettings={labelSettings}
          />
          <input
            id={`address_care_of_${id}`}
            className={cn('form-control', {
              'validation-error': allValidations.careOf.errors.length,
              disabled: readOnly,
            })}
            value={careOf}
            onChange={(event) => setCareOf(event.target.value)}
            onBlur={(event) =>
              handleDataChange(event.target.value, AddressKeys.careOf)
            }
            readOnly={readOnly}
          />
          {allValidations?.[AddressKeys.careOf]
            ? renderValidationMessagesForComponent(
                allValidations[AddressKeys.careOf],
                `${id}_${AddressKeys.careOf}`,
              )
            : null}
        </>
      )}

      <div className='address-component-postplace-zipCode'>
        <div className='address-component-zipCode'>
          <AddressLabel
            labelKey='address_component.zip_code'
            id={`address_zip_code_${id}`}
            language={language}
            required={required}
            readOnly={readOnly}
            labelSettings={labelSettings}
          />
          <input
            id={`address_zip_code_${id}`}
            className={cn('address-component-small-inputs', 'form-control', {
              'validation-error': allValidations.zipCode.errors.length,
              disabled: readOnly,
            })}
            value={zipCode}
            onChange={(event) => setZipCode(event.target.value)}
            onBlur={handleBlurZipCode}
            readOnly={readOnly}
            required={required}
            inputMode='numeric'
          />
          {allValidations?.[AddressKeys.careOf]
            ? renderValidationMessagesForComponent(
                allValidations[AddressKeys.zipCode],
                `${id}_${AddressKeys.zipCode}`,
              )
            : null}
        </div>

        <div className='address-component-postplace'>
          <AddressLabel
            labelKey='address_component.post_place'
            id={`address_post_place_${id}`}
            language={language}
            required={required}
            readOnly={true}
            labelSettings={labelSettings}
          />
          <input
            id={`address_post_place_${id}`}
            className={cn('form-control disabled', {
              'validation-error': allValidations.postPlace.errors.length,
            })}
            value={postPlace}
            readOnly={true}
            required={required}
          />
          {allValidations?.[AddressKeys.postPlace]
            ? renderValidationMessagesForComponent(
                allValidations[AddressKeys.postPlace],
                `${id}_${AddressKeys.postPlace}`,
              )
            : null}
        </div>
      </div>
      {!simplified && (
        <>
          <AddressLabel
            labelKey='address_component.house_number'
            id={`address_house_number_${id}`}
            language={language}
            required={required}
            readOnly={readOnly}
            labelSettings={labelSettings}
          />
          <p>
            {getLanguageFromKey(
              'address_component.house_number_helper',
              language,
            )}
          </p>
          <input
            id={`address_house_number_${id}`}
            className={cn('address-component-small-inputs', 'form-control', {
              'validation-error': allValidations.houseNumber.errors.length,
              disabled: readOnly,
            })}
            value={houseNumber}
            onChange={(event) => setHouseNumber(event.target.value)}
            onBlur={handleBlurHouseNumber}
            readOnly={readOnly}
          />
          {allValidations?.[AddressKeys.houseNumber]
            ? renderValidationMessagesForComponent(
                allValidations[AddressKeys.houseNumber],
                `${id}_${AddressKeys.houseNumber}`,
              )
            : null}
        </>
      )}
    </div>
  );
}
