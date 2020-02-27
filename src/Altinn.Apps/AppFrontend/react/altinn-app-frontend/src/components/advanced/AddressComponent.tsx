import axios from 'axios';
import classNames = require('classnames');
import update from 'immutability-helper';
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
  const initialAddressValues: any = {
    address: '',
    zipCode: '',
    postPlace: '',
    careOf: '',
    houseNumber: '',
  };
  
  const [addressValues, setAddressValues] = React.useState(initialAddressValues);
  const [validations, setValidations] = React.useState({} as any);

  // React.useEffect(() => {
  //   return function cleanup() {
  //     source.cancel('ComponentWillUnmount');
  //   }
  // });

  React.useEffect(() => {
    const formData = props.formData;
    setAddressValues({
      address: formData.address || '',
      zipCode: formData.zipCode || '',
      postPlace: formData.postPlace || '',
      careOf: formData.careOf || '',
      houseNumber: formData.houseNumber || '',
    });
  }, [props.formData]);

  React.useEffect(() => {
  },[addressValues]);

  const fetchPostPlace = async (zipCode: string, cancellationToken: any) => {
    try {
      if (zipCode.match(new RegExp('^[0-9]{4}$'))) {
        const response = await get('https://api.bring.com/shippingguide/api/postalCode.json',
          {
            params: {
              clientUrl: window.location.href,
              pnr: zipCode,
            },
            cancelToken: cancellationToken,
          });
        if (response.valid) {
          setAddressValues({...addressValues, postPlace: response.result});
          setValidations({...validations, zipCode: null});
          props.handleDataChange(addressValues.zipCode, AddressKeys.zipCode);
          onBlurField(AddressKeys.postPlace);

        } else {
          const errorMessage = getLanguageFromKey('address_component.validation_error_zipcode', props.language);
          setAddressValues({...addressValues, postPlace: ''});
          setValidations({...validations, zipCode: errorMessage});
        }
      } else {
        setAddressValues({...addressValues, postPlace: ''});
        onBlurField(AddressKeys.postPlace);
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        // Intentionally ignored
      } else {
        console.error(err);
      }
    }
  }

  const onBlurField: (key: AddressKeys) => void = (key: AddressKeys) => {
    const validationErrors: IAddressValidationErrors = validate();
    if (!validationErrors.zipCode) {
      if (key === AddressKeys.zipCode && addressValues.zipCode) {
        fetchPostPlace(addressValues.zipCode, source.cancel);
        return;
      }
    }

    props.handleDataChange(addressValues[key], key);
    setValidations(validationErrors);
  }

  const validate: () => IAddressValidationErrors = () => {
    const { zipCode, houseNumber } = addressValues;
    const validationErrors: IAddressValidationErrors = {
      zipCode: null,
      houseNumber: null,
    };
    if (zipCode !== null && zipCode !== '' && !zipCode.match(new RegExp('^[0-9]{4}$'))) {
      validationErrors.zipCode = getLanguageFromKey(
        'address_component.validation_error_zipcode', props.language,
        );
      setAddressValues({...addressValues, postPlace: ''});
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
    console.log("update field. value: ", changedFieldValue, " key: ", changedKey);
    const newValues = {
      ...addressValues,
      [changedKey]: changedFieldValue,
    };
    console.log('new values ', newValues);
    setAddressValues(newValues);
    console.log('Address values: ', addressValues);
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
    <div className={'address-component'}>
      {renderLabel('ux_editor.modal_configure_address_component_address')}
      <input
        className={classNames('form-control',
          {
            'validation-error': (allValidations.address.errors.length),
            'disabled': props.readOnly,
          })}
        value={addressValues.address}
        onChange={updateField.bind(null, AddressKeys.address)}
        onBlur={onBlurField.bind(null, AddressKeys.address)}
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
          value={addressValues.careOf}
          onChange={updateField.bind(null, AddressKeys.careOf)}
          onBlur={onBlurField.bind(null, AddressKeys.careOf)}
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
              value={addressValues.zipCode}
              onChange={updateField.bind(null, AddressKeys.zipCode)}
              onBlur={onBlurField.bind(null, AddressKeys.zipCode)}
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
              value={addressValues.postPlace}
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
            value={addressValues.houseNumber}
            onChange={updateField.bind(null, AddressKeys.houseNumber)}
            onBlur={onBlurField.bind(null, AddressKeys.houseNumber)}
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
