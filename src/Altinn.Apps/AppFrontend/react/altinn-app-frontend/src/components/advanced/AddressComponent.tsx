import axios from 'axios';
import classNames = require('classnames');
import * as React from 'react';
import { getLanguageFromKey, get } from 'altinn-shared/utils';
import { IDataModelBindings, ITextResourceBindings } from '../../features/form/layout';
import '../../styles/AddressComponent.css';
import '../../styles/shared.css';
import { IComponentValidations } from '../../types/global';
import { renderValidationMessagesForComponent } from '../../utils/render';

export interface IAddressComponentProps {
  id: string;
  formData: { [id: string]: string };
  handleDataChange: (value: any, key: string) => void;
  getTextResource: (key: string) => string;
  isValid?: boolean;
  simplified: boolean;
  validationMessages?: IComponentValidations;
  dataModelBindings: IDataModelBindings;
  readOnly: boolean;
  required: boolean;
  language: any;
  textResourceBindings: ITextResourceBindings;
  addressComponentValidations?: any;
}

interface IAddressValidationErrors {
  address?: string;
  zipCode?: string;
  houseNumber?: string;
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
    const zipCode = props.formData.zipCode;
    if (!zipCode || zipCode === ''){
      return;
    } 

    if (!zipCode.match(new RegExp('^[0-9]{4}$'))) {
      const errorMessage = getLanguageFromKey('address_component.validation_error_zipcode', props.language);
      setPostPlace('');
      setValidations({...validations, zipCode: errorMessage});
      return;
    }

    const fetchPostPlace = async (zipCode: string, cancellationToken: any) => {

      try {
        const response = await get('https://api.bring.com/shippingguide/api/postalCode.json',
          {
            params: {
              clientUrl: window.location.href,
              pnr: zipCode,
            },
            cancelToken: cancellationToken,
          });
        if (response.valid) {
          setPostPlace(response.result);
          setValidations({...validations, zipCode: null});
          onBlurField(AddressKeys.postPlace, response.result);

        } else {
          const errorMessage = getLanguageFromKey('address_component.validation_error_zipcode', props.language);
          setPostPlace('');
          setValidations({...validations, zipCode: errorMessage});
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
    }
  }, [props.formData.zipCode])

  

  const onBlurField: (key: AddressKeys, value: any) => void = (key: AddressKeys, value: any) => {
    const validationErrors: IAddressValidationErrors = validate();
    props.handleDataChange(value, key);
    setValidations(validationErrors);
  }

  const validate: () => IAddressValidationErrors = () => {
    const validationErrors: IAddressValidationErrors = {
      zipCode: null,
      houseNumber: null,
    };
    if (zipCode !== null && zipCode !== '' && !zipCode.match(new RegExp('^[0-9]{4}$'))) {
      validationErrors.zipCode = getLanguageFromKey(
        'address_component.validation_error_zipcode', props.language,
        );
      setPostPlace('');
    } else {
      validationErrors.zipCode = null;
    }
    if (!houseNumber.match(new RegExp('^[a-z,A-Z]{1}[0-9]{4}$')) && houseNumber !== '') {
      validationErrors.houseNumber = getLanguageFromKey(
        'address_component.validation_error_house_number', props.language,
        );
    } else {
      validationErrors.houseNumber = null;
    }
    return validationErrors;
  }

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
  }

  const joinValidationMessages = (): IComponentValidations => {
    let validationMessages = props.addressComponentValidations;
    if (!validationMessages) {
      validationMessages = {};
    }
    for (const fieldKey in AddressKeys) {
      if (!validationMessages[fieldKey]) {
        validationMessages[fieldKey] = {
          errors: [],
          warnings: [],
        };
      }
    }
    for (const fieldKey in validations) {
      if (!validations[fieldKey]) {
        continue;
      }
      if (validationMessages[fieldKey]) {
        const validationMessage = validations[fieldKey];
        const match = validationMessages[fieldKey].errors.indexOf(validationMessage) > -1;
        if (!match) {
          validationMessages[fieldKey].errors.push(validations[fieldKey]);
        }
      } else {
        validationMessages[fieldKey] = {
          errors: [],
          warnings: [],
        };
        validationMessages[fieldKey].errors = [validations[fieldKey]];
      }
    }
    return validationMessages;
  }

  const renderLabel = (labelKey: string, hideOptional?: boolean) => {
    const label = getLanguageFromKey(labelKey, props.language);
    return (
      <label className='a-form-label title-label' htmlFor={props.id}>
        {label}
        {props.required || hideOptional ? null :
          <span className='label-optional'>({getLanguageFromKey('general.optional', props.language)})</span>
        }
      </label>
    );
  }

  const allValidations = joinValidationMessages();

  return(
    <div className={'address-component'} key={'address_' + props.id}>
      {renderLabel('ux_editor.modal_configure_address_component_address')}
      <input
        className={classNames('form-control',
          {
            'validation-error': (allValidations.address.errors.length),
            'disabled': props.readOnly,
          })}
        value={address}
        onChange={updateField.bind(null, AddressKeys.address)}
        onBlur={onBlurField.bind(null, AddressKeys.address, address)}
        readOnly={props.readOnly}
        required={props.required}
      />
      {allValidations ?
          renderValidationMessagesForComponent(allValidations[AddressKeys.address],
            `${props.id}_${AddressKeys.address}`)
          : null}
      {
        !props.simplified &&
        <>
        {renderLabel('ux_editor.modal_configure_address_component_care_of')}
        <input
          className={classNames('form-control',
            {
              'validation-error': (allValidations.careOf.errors.length),
              'disabled': props.readOnly,
            })}
          value={careOf}
          onChange={updateField.bind(null, AddressKeys.careOf)}
          onBlur={onBlurField.bind(null, AddressKeys.careOf, careOf)}
          readOnly={props.readOnly}
        />
        {allValidations ?
        renderValidationMessagesForComponent(allValidations[AddressKeys.careOf],
          `${props.id}_${AddressKeys.careOf}`)
        : null}
        </>
      }

        <div className={'address-component-postplace-zipCode'}>
          <div className={'address-component-zipCode'}>
            {renderLabel('ux_editor.modal_configure_address_component_zip_code')}
            <input
              className={classNames('address-component-small-inputs', 'form-control',
                {
                  'validation-error': (allValidations.zipCode.errors.length),
                  'disabled': props.readOnly,
                })}
              value={zipCode}
              onChange={updateField.bind(null, AddressKeys.zipCode)}
              onBlur={onBlurField.bind(null, AddressKeys.zipCode, zipCode)}
              readOnly={props.readOnly}
              required={props.required}
            />
            {allValidations ?
              renderValidationMessagesForComponent(allValidations[AddressKeys.zipCode],
                `${props.id}_${AddressKeys.zipCode}`)
              : null}
          </div>

          <div className={'address-component-postplace'}>
            {renderLabel('ux_editor.modal_configure_address_component_post_place', true)}
            <input
              className={classNames('form-control disabled',
                {
                  'validation-error': (allValidations.postPlace.errors.length),
                })}
              value={postPlace}
              readOnly={true}
            />
            {allValidations ?
              renderValidationMessagesForComponent(allValidations[AddressKeys.postPlace],
                `${props.id}_${AddressKeys.postPlace}`)
              : null}
          </div>
        </div>
        {  !props.simplified &&
          <>
          {renderLabel('ux_editor.modal_configure_address_component_house_number')}
          <p>
            {
              getLanguageFromKey('ux_editor.modal_configure_address_component_house_number_helper',
              props.language)
            }
          </p>
          <input
            className={classNames('address-component-small-inputs', 'form-control',
              {
                'validation-error': (allValidations.houseNumber.errors.length),
                'disabled': props.readOnly,
              })}
            value={houseNumber}
            onChange={updateField.bind(null, AddressKeys.houseNumber)}
            onBlur={onBlurField.bind(null, AddressKeys.houseNumber, houseNumber)}
            readOnly={props.readOnly}
          />
          {allValidations ?
            renderValidationMessagesForComponent(allValidations[AddressKeys.houseNumber],
              `${props.id}_${AddressKeys.houseNumber}`)
            : null}
          </>
        }
    </div>
  );
}
