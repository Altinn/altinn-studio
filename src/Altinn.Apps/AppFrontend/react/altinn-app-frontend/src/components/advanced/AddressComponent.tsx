/* eslint-disable import/order */
/* eslint-disable no-shadow */
/* eslint-disable consistent-return */
/* eslint-disable react/prop-types */
import axios from 'axios';
import * as React from 'react';
import { getLanguageFromKey, get } from 'altinn-shared/utils';
import { IComponentValidations, ILabelSettings } from 'src/types';
import { IDataModelBindings, ITextResourceBindings } from '../../features/form/layout';
import '../../styles/AddressComponent.css';
import '../../styles/shared.css';
import { renderValidationMessagesForComponent } from '../../utils/render';
import classNames from 'classnames';

export interface IAddressComponentProps {
  id: string;
  formData: { [id: string]: string };
  handleDataChange: (value: any, key: string) => void;
  getTextResource: (key: string) => string;
  isValid?: boolean;
  simplified: boolean;
  dataModelBindings: IDataModelBindings;
  readOnly: boolean;
  required: boolean;
  labelSettings?: ILabelSettings;
  language: any;
  textResourceBindings: ITextResourceBindings;
  componentValidations?: IComponentValidations;
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

export function AddressComponent(props: IAddressComponentProps) {
  const cancelToken = axios.CancelToken;
  const source = cancelToken.source();

  const [address, setAddress] = React.useState(props.formData.address || '');
  const [zipCode, setZipCode] = React.useState(props.formData.zipCode || '');
  const [postPlace, setPostPlace] = React.useState(props.formData.postPlace || '');
  const [careOf, setCareOf] = React.useState(props.formData.careOf || '');
  const [houseNumber, setHouseNumber] = React.useState(props.formData.houseNumber || '');
  const [validations, setValidations] = React.useState({} as any);

  React.useEffect(() => {
    setAddress(props.formData.address || '');
    setZipCode(props.formData.zipCode || '');
    setPostPlace(props.formData.postPlace || '');
    setCareOf(props.formData.careOf || '');
    setHouseNumber(props.formData.houseNumber || '');
  }, [props.formData]);

  React.useEffect(() => {
    if (!zipCode || !zipCode.match(new RegExp('^[0-9]{4}$'))) {
      setPostPlace('');
      return;
    }

    const fetchPostPlace = async (pnr: string, cancellationToken: any) => {
      try {
        const response = await get('https://api.bring.com/shippingguide/api/postalCode.json',
          {
            params: {
              clientUrl: window.location.href,
              pnr,
            },
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            cancelToken: cancellationToken,
          });
        if (response.valid) {
          setPostPlace(response.result);
          setValidations({ ...validations, zipCode: null });
          onBlurField(AddressKeys.postPlace, response.result);
        } else {
          const errorMessage = getLanguageFromKey('address_component.validation_error_zipcode', props.language);
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

    fetchPostPlace(props.formData.zipCode, source.token);
    return function cleanup() {
      source.cancel('ComponentWillUnmount');
    };
  }, [props.formData.zipCode]);

  const onBlurField: (key: AddressKeys, value: any) => void = (key: AddressKeys, value: any) => {
    const validationErrors: IAddressValidationErrors = validate();
    setValidations(validationErrors);
    if (!validationErrors[key]) {
      props.handleDataChange(value, key);
      if (key === AddressKeys.zipCode && !value) {
        // if we are removing a zip code, also remove post place from form data
        onBlurField(AddressKeys.postPlace, '');
      }
    }
  };

  const validate: () => IAddressValidationErrors = () => {
    const validationErrors: IAddressValidationErrors = {
      zipCode: null,
      houseNumber: null,
      postPlace: null,
    };
    if (zipCode && !zipCode.match(new RegExp('^[0-9]{4}$'))) {
      validationErrors.zipCode = getLanguageFromKey(
        'address_component.validation_error_zipcode', props.language,
      );
      setPostPlace('');
    } else {
      validationErrors.zipCode = null;
    }
    if (houseNumber && !houseNumber.match(new RegExp('^[a-z,A-Z]{1}[0-9]{4}$'))) {
      validationErrors.houseNumber = getLanguageFromKey(
        'address_component.validation_error_house_number', props.language,
      );
    } else {
      validationErrors.houseNumber = null;
    }
    return validationErrors;
  };

  const updateField: (key: AddressKeys, event: any) => void = (key: AddressKeys, event: any): void => {
    const changedFieldValue: string = event.target.value;
    const changedKey: string = AddressKeys[key];

    switch (changedKey) {
      case (AddressKeys.address): {
        setAddress(changedFieldValue);
        break;
      }
      case (AddressKeys.careOf): {
        setCareOf(changedFieldValue);
        break;
      }
      case (AddressKeys.houseNumber): {
        setHouseNumber(changedFieldValue);
        break;
      }
      case (AddressKeys.postPlace): {
        setPostPlace(changedFieldValue);
        break;
      }
      case (AddressKeys.zipCode): {
        setZipCode(changedFieldValue);
        break;
      }
      default:
        break;
    }
  };

  const joinValidationMessages = (): IComponentValidations => {
    let validationMessages = props.componentValidations;
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
          }
        };
      }
    });

    Object.keys(validations).forEach((fieldKey: string) => {
      if (validations[fieldKey]) {
        if (validationMessages[fieldKey]) {
          const validationMessage = validations[fieldKey];
          const match = validationMessages[fieldKey].errors.indexOf(validationMessage) > -1;
          if (!match) {
            validationMessages[fieldKey].errors.push(validations[fieldKey]);
          }
        } else {
          validationMessages = {
            ...validationMessages,
            [fieldKey]: {
              errors: [],
              warnings: [],
            }
          };
          validationMessages[fieldKey].errors = [validations[fieldKey]];
        }
      }
    });

    return validationMessages;
  };

  const renderLabel = (labelKey: string, id: string, hideOptional?: boolean) => {
    const label = getLanguageFromKey(labelKey, props.language);
    return (
      <label className='a-form-label title-label' htmlFor={id}>
        {label}
        {props.required || props.readOnly || props.labelSettings?.optionalIndicator === false || hideOptional ?
          null :
          <span className='label-optional'>
            {` (${getLanguageFromKey('general.optional', props.language)})`}
          </span>
        }
      </label>
    );
  };

  const allValidations = joinValidationMessages();

  return (
    <div className='address-component' key={`address_component_${props.id}`}>
      {renderLabel('address_component.address', `address_address_${props.id}`)}
      <input
        id={`address_address_${props.id}`}
        className={classNames('form-control',
          {
            'validation-error': (allValidations.address.errors.length),
            disabled: props.readOnly,
          })}
        value={address}
        onChange={updateField.bind(null, AddressKeys.address)}
        onBlur={onBlurField.bind(null, AddressKeys.address, address)}
        readOnly={props.readOnly}
        required={props.required}
      />
      {allValidations?.[AddressKeys.address] ?
        renderValidationMessagesForComponent(allValidations[AddressKeys.address],
          `${props.id}_${AddressKeys.address}`)
        : null}
      {
        !props.simplified &&
        <>
          {renderLabel('address_component.care_of', `address_care_of_${props.id}`)}
          <input
            id={`address_care_of_${props.id}`}
            className={classNames('form-control',
              {
                'validation-error': (allValidations.careOf.errors.length),
                disabled: props.readOnly,
              })}
            value={careOf}
            onChange={updateField.bind(null, AddressKeys.careOf)}
            onBlur={onBlurField.bind(null, AddressKeys.careOf, careOf)}
            readOnly={props.readOnly}
          />
          {allValidations?.[AddressKeys.careOf] ?
            renderValidationMessagesForComponent(allValidations[AddressKeys.careOf],
              `${props.id}_${AddressKeys.careOf}`)
            : null}
        </>
      }

      <div className='address-component-postplace-zipCode'>
        <div className='address-component-zipCode'>
          {renderLabel('address_component.zip_code', `address_zip_code_${props.id}`)}
          <input
            id={`address_zip_code_${props.id}`}
            className={classNames('address-component-small-inputs', 'form-control',
              {
                'validation-error': (allValidations.zipCode.errors.length),
                disabled: props.readOnly,
              })}
            value={zipCode}
            onChange={updateField.bind(null, AddressKeys.zipCode)}
            onBlur={onBlurField.bind(null, AddressKeys.zipCode, zipCode)}
            readOnly={props.readOnly}
            required={props.required}
            type='number'
          />
          {allValidations?.[AddressKeys.careOf] ?
            renderValidationMessagesForComponent(allValidations[AddressKeys.zipCode],
              `${props.id}_${AddressKeys.zipCode}`)
            : null}
        </div>

        <div className='address-component-postplace'>
          {renderLabel('address_component.post_place', `address_post_place_${props.id}`, true)}
          <input
            id={`address_post_place_${props.id}`}
            className={classNames('form-control disabled',
              {
                'validation-error': (allValidations.postPlace.errors.length),
              })}
            value={postPlace}
            readOnly={true}
            required={props.required}
          />
          {allValidations?.[AddressKeys.postPlace] ?
            renderValidationMessagesForComponent(allValidations[AddressKeys.postPlace],
              `${props.id}_${AddressKeys.postPlace}`)
            : null}
        </div>
      </div>
      { !props.simplified &&
      <>
        {renderLabel('address_component.house_number', `address_house_number_${props.id}`)}
        <p>
          {
            getLanguageFromKey('address_component.house_number_helper',
              props.language)
          }
        </p>
        <input
          id={`address_house_number_${props.id}`}
          className={classNames('address-component-small-inputs', 'form-control',
            {
              'validation-error': (allValidations.houseNumber.errors.length),
              disabled: props.readOnly,
            })}
          value={houseNumber}
          onChange={updateField.bind(null, AddressKeys.houseNumber)}
          onBlur={onBlurField.bind(null, AddressKeys.houseNumber, houseNumber)}
          readOnly={props.readOnly}
        />
        {allValidations?.[AddressKeys.houseNumber] ?
          renderValidationMessagesForComponent(allValidations[AddressKeys.houseNumber],
            `${props.id}_${AddressKeys.houseNumber}`)
          : null}
      </>
      }
    </div>
  );
}
