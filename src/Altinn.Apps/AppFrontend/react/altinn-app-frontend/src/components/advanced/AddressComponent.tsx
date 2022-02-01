import axios from 'axios';
import * as React from 'react';
import cn from 'classnames';

import { getLanguageFromKey, get } from 'altinn-shared/utils';
import { IComponentValidations, ILabelSettings } from 'src/types';
import { renderValidationMessagesForComponent } from '../../utils/render';
import { IComponentProps } from '..';
import { AddressLabel } from './AddressLabel';

import './AddressComponent.css';
import '../../styles/shared.css';
export interface IAddressComponentProps extends IComponentProps {
  simplified: boolean;
  labelSettings?: ILabelSettings;
}

interface IAddressValidationErrors {
  address?: string;
  zipCode?: string;
  houseNumber?: string;
  postPlace?: string;
}

export enum AddressKeys {
  address = 'address',
  zipCode = 'zipCode',
  postPlace = 'postPlace',
  careOf = 'careOf',
  houseNumber = 'houseNumber',
}

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
  const cancelToken = axios.CancelToken;
  const source = cancelToken.source();

  const [address, setAddress] = React.useState(formData.address || '');
  const [zipCode, setZipCode] = React.useState(formData.zipCode || '');
  const [postPlace, setPostPlace] = React.useState(formData.postPlace || '');
  const [careOf, setCareOf] = React.useState(formData.careOf || '');
  const [houseNumber, setHouseNumber] = React.useState(
    formData.houseNumber || '',
  );
  const [validations, setValidations] = React.useState({} as any);
  const prevZipCode = React.useRef(null);

  React.useEffect(() => {
    setAddress(formData.address || '');
    setZipCode(formData.zipCode || '');
    setPostPlace(formData.postPlace || '');
    setCareOf(formData.careOf || '');
    setHouseNumber(formData.houseNumber || '');
  }, [
    formData.address,
    formData.zipCode,
    formData.postPlace,
    formData.careOf,
    formData.houseNumber,
  ]);

  const validate = React.useCallback(() => {
    const validationErrors: IAddressValidationErrors = {
      zipCode: null,
      houseNumber: null,
      postPlace: null,
    };
    if (zipCode && !zipCode.match(/^\d{4}$/)) {
      validationErrors.zipCode = getLanguageFromKey(
        'address_component.validation_error_zipcode',
        language,
      );
      setPostPlace('');
    } else {
      validationErrors.zipCode = null;
    }
    if (
      houseNumber &&
      !houseNumber.match(/^[a-z,A-Z]{1}\d{4}$/)
    ) {
      validationErrors.houseNumber = getLanguageFromKey(
        'address_component.validation_error_house_number',
        language,
      );
    } else {
      validationErrors.houseNumber = null;
    }
    return validationErrors;
  }, [houseNumber, language, zipCode]);

  const onBlurField = React.useCallback(
    (key: AddressKeys, value: any) => {
      const validationErrors: IAddressValidationErrors = validate();
      setValidations(validationErrors);
      if (!validationErrors[key]) {
        handleDataChange(value, key);
        if (key === AddressKeys.zipCode && !value) {
          // if we are removing a zip code, also remove post place from form data
          onBlurField(AddressKeys.postPlace, '');
        }
      }
    },
    [validate, handleDataChange],
  );

  React.useEffect(() => {
    if (
      !formData.zipCode ||
      !formData.zipCode.match(/^\d{4}$/)
    ) {
      setPostPlace('');
      return;
    }

    if (prevZipCode.current === formData.zipCode) {
      return;
    }

    const fetchPostPlace = async (pnr: string, cancellationToken: any) => {
      try {
        prevZipCode.current = formData.zipCode;
        const response = await get(
          'https://api.bring.com/shippingguide/api/postalCode.json',
          {
            params: {
              clientUrl: window.location.href,
              pnr,
            },
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            cancelToken: cancellationToken,
          },
        );
        if (response.valid) {
          setPostPlace(response.result);
          setValidations({ ...validations, zipCode: null });
          onBlurField(AddressKeys.postPlace, response.result);
        } else {
          const errorMessage = getLanguageFromKey(
            'address_component.validation_error_zipcode',
            language,
          );
          setPostPlace('');
          setValidations({ ...validations, zipCode: errorMessage });
        }
      } catch (err) {
        if (axios.isCancel(err)) {
          // Intentionally ignored
        } else {
          console.error(err);
        }
      }
    };

    fetchPostPlace(formData.zipCode, source.token);
    return function cleanup() {
      source.cancel('ComponentWillUnmount');
    };
  }, [formData.zipCode, language, source, onBlurField, validations]);

  const updateField: (key: AddressKeys, event: any) => void = (
    key: AddressKeys,
    event: any,
  ): void => {
    const changedFieldValue: string = event.target.value;
    const changedKey: string = AddressKeys[key];

    switch (changedKey) {
      case AddressKeys.address: {
        setAddress(changedFieldValue);
        break;
      }
      case AddressKeys.careOf: {
        setCareOf(changedFieldValue);
        break;
      }
      case AddressKeys.houseNumber: {
        setHouseNumber(changedFieldValue);
        break;
      }
      case AddressKeys.postPlace: {
        setPostPlace(changedFieldValue);
        break;
      }
      case AddressKeys.zipCode: {
        setZipCode(changedFieldValue);
        break;
      }
      default:
        break;
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
        onChange={updateField.bind(null, AddressKeys.address)}
        onBlur={onBlurField.bind(null, AddressKeys.address, address)}
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
            onChange={updateField.bind(null, AddressKeys.careOf)}
            onBlur={onBlurField.bind(null, AddressKeys.careOf, careOf)}
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
            className={cn(
              'address-component-small-inputs',
              'form-control',
              {
                'validation-error': allValidations.zipCode.errors.length,
                disabled: readOnly,
              },
            )}
            value={zipCode}
            onChange={updateField.bind(null, AddressKeys.zipCode)}
            onBlur={onBlurField.bind(null, AddressKeys.zipCode, zipCode)}
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
            className={cn(
              'address-component-small-inputs',
              'form-control',
              {
                'validation-error': allValidations.houseNumber.errors.length,
                disabled: readOnly,
              },
            )}
            value={houseNumber}
            onChange={updateField.bind(null, AddressKeys.houseNumber)}
            onBlur={onBlurField.bind(
              null,
              AddressKeys.houseNumber,
              houseNumber,
            )}
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
