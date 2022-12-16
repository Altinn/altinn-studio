import React from 'react';

import { TextField } from '@altinn/altinn-design-system';
import axios from 'axios';

import { useDelayedSavedState } from 'src/components/hooks/useDelayedSavedState';
import { AddressLabel } from 'src/layout/Address/AddressLabel';
import { renderValidationMessagesForComponent } from 'src/utils/render';
import { get, getLanguageFromKey } from 'src/utils/sharedUtils';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IComponentValidations } from 'src/types';

import 'src/layout/Address/AddressComponent.css';

export type IAddressComponentProps = PropsFromGenericComponent<'AddressComponent'>;

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
  saveWhileTyping,
}: IAddressComponentProps) {
  // eslint-disable-next-line import/no-named-as-default-member
  const cancelToken = axios.CancelToken;
  const source = cancelToken.source();

  const handleDataChangeOverride =
    (key: AddressKeys): IAddressComponentProps['handleDataChange'] =>
    (value) =>
      onSaveField(key, value);

  const {
    value: address,
    setValue: setAddress,
    onPaste: onAddressPaste,
  } = useDelayedSavedState(handleDataChangeOverride(AddressKeys.address), formData.address || '', saveWhileTyping);
  const {
    value: zipCode,
    setValue: setZipCode,
    onPaste: onZipCodePaste,
  } = useDelayedSavedState(handleDataChangeOverride(AddressKeys.zipCode), formData.zipCode || '', saveWhileTyping);
  const { value: postPlace, setValue: setPostPlace } = useDelayedSavedState(
    handleDataChangeOverride(AddressKeys.postPlace),
    formData.postPlace || '',
    saveWhileTyping,
  );
  const {
    value: careOf,
    setValue: setCareOf,
    onPaste: onCareOfPaste,
  } = useDelayedSavedState(handleDataChangeOverride(AddressKeys.careOf), formData.careOf || '', saveWhileTyping);
  const {
    value: houseNumber,
    setValue: setHouseNumber,
    onPaste: onHouseNumberPaste,
  } = useDelayedSavedState(
    handleDataChangeOverride(AddressKeys.houseNumber),
    formData.houseNumber || '',
    saveWhileTyping,
  );

  const [validations, setValidations] = React.useState<IAddressValidationErrors>({});
  const prevZipCode = React.useRef<string | undefined>(undefined);
  const hasFetchedPostPlace = React.useRef<boolean>(false);

  const validate = React.useCallback(() => {
    const validationErrors: IAddressValidationErrors = {};
    if (zipCode && !zipCode.match(/^\d{4}$/)) {
      validationErrors.zipCode = getLanguageFromKey('address_component.validation_error_zipcode', language);
      setPostPlace('');
    } else {
      delete validationErrors.zipCode;
    }
    if (houseNumber && !houseNumber.match(/^[a-z,A-Z]\d{4}$/)) {
      validationErrors.houseNumber = getLanguageFromKey('address_component.validation_error_house_number', language);
    } else {
      delete validationErrors.houseNumber;
    }
    return validationErrors;
  }, [houseNumber, language, zipCode, setPostPlace]);

  const onSaveField = React.useCallback(
    (key: AddressKeys, value: any) => {
      const validationErrors: IAddressValidationErrors = validate();
      setValidations(validationErrors);
      if (!validationErrors[key]) {
        handleDataChange(value, { key });
        if (key === AddressKeys.zipCode && !value) {
          // if we are removing a zip code, also remove post place from form data
          setPostPlace('', true);
        }
      }
    },
    [validate, handleDataChange, setPostPlace],
  );

  React.useEffect(() => {
    if (!formData.zipCode || !formData.zipCode.match(/^\d{4}$/)) {
      setPostPlace('');
      return;
    }

    if (prevZipCode.current === formData.zipCode && hasFetchedPostPlace.current === true) {
      return;
    }

    const fetchPostPlace = async (pnr: string, cancellationToken: any) => {
      hasFetchedPostPlace.current = false;
      try {
        prevZipCode.current = formData.zipCode;
        const response = await get('https://api.bring.com/shippingguide/api/postalCode.json', {
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
          setValidations({ ...validations, zipCode: undefined });
          onSaveField(AddressKeys.postPlace, response.result);
        } else {
          const errorMessage = getLanguageFromKey('address_component.validation_error_zipcode', language);
          setPostPlace('');
          setValidations({ ...validations, zipCode: errorMessage });
        }
        hasFetchedPostPlace.current = true;
      } catch (err) {
        // eslint-disable-next-line import/no-named-as-default-member
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
  }, [formData.zipCode, language, source, onSaveField, validations, setPostPlace]);

  const updateField = (key: AddressKeys, saveImmediately: boolean, event: any): void => {
    const changedFieldValue: string = event.target.value;
    const changedKey: string = AddressKeys[key];

    switch (changedKey) {
      case AddressKeys.address: {
        setAddress(changedFieldValue, saveImmediately);
        break;
      }
      case AddressKeys.careOf: {
        setCareOf(changedFieldValue, saveImmediately);
        break;
      }
      case AddressKeys.houseNumber: {
        setHouseNumber(changedFieldValue, saveImmediately);
        break;
      }
      case AddressKeys.postPlace: {
        setPostPlace(changedFieldValue, saveImmediately);
        break;
      }
      case AddressKeys.zipCode: {
        setZipCode(changedFieldValue, saveImmediately);
        break;
      }
      default:
        break;
    }
  };

  const joinValidationMessages = (): IComponentValidations => {
    let validationMessages = componentValidations || {};

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
      const source = validations[fieldKey];
      if (source) {
        const target = validationMessages[fieldKey];
        if (target) {
          const match = target.errors && target.errors.indexOf(source) > -1;
          if (!match) {
            validationMessages[fieldKey]?.errors?.push(validations[fieldKey]);
          }
        } else {
          validationMessages = {
            ...validationMessages,
            [fieldKey]: {
              errors: [],
              warnings: [],
            },
          };
          (validationMessages[fieldKey] || {}).errors = [validations[fieldKey]];
        }
      }
    });

    return validationMessages;
  };

  const allValidations = joinValidationMessages();

  return (
    <div
      className='address-component'
      key={`address_component_${id}`}
    >
      <div>
        <AddressLabel
          labelKey={'address_component.address'}
          id={`address_address_${id}`}
          language={language}
          required={required}
          readOnly={readOnly}
          labelSettings={labelSettings}
        />
        <TextField
          id={`address_address_${id}`}
          isValid={allValidations.address?.errors?.length === 0}
          value={address}
          onChange={updateField.bind(null, AddressKeys.address, false)}
          onBlur={updateField.bind(null, AddressKeys.address, true)}
          onPaste={() => onAddressPaste()}
          readOnly={readOnly}
          required={required}
        />
        {allValidations?.[AddressKeys.address]
          ? renderValidationMessagesForComponent(allValidations[AddressKeys.address], `${id}_${AddressKeys.address}`)
          : null}
      </div>

      {!simplified && (
        <div>
          <AddressLabel
            labelKey={'address_component.care_of'}
            id={`address_care_of_${id}`}
            language={language}
            required={required}
            readOnly={readOnly}
            labelSettings={labelSettings}
          />
          <TextField
            id={`address_care_of_${id}`}
            isValid={allValidations.careOf?.errors?.length === 0}
            value={careOf}
            onChange={updateField.bind(null, AddressKeys.careOf, false)}
            onBlur={updateField.bind(null, AddressKeys.careOf, true)}
            onPaste={() => onCareOfPaste()}
            readOnly={readOnly}
          />
          {allValidations?.[AddressKeys.careOf]
            ? renderValidationMessagesForComponent(allValidations[AddressKeys.careOf], `${id}_${AddressKeys.careOf}`)
            : null}
        </div>
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
          <div className={'address-component-small-inputs'}>
            <TextField
              id={`address_zip_code_${id}`}
              isValid={allValidations.zipCode?.errors?.length === 0}
              value={zipCode}
              onChange={updateField.bind(null, AddressKeys.zipCode, false)}
              onBlur={updateField.bind(null, AddressKeys.zipCode, true)}
              onPaste={() => onZipCodePaste()}
              readOnly={readOnly}
              required={required}
              inputMode='numeric'
            />
          </div>
          {allValidations?.[AddressKeys.careOf]
            ? renderValidationMessagesForComponent(allValidations[AddressKeys.zipCode], `${id}_${AddressKeys.zipCode}`)
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
          <TextField
            id={`address_post_place_${id}`}
            isValid={allValidations.postPlace?.errors?.length === 0}
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
        <div>
          <AddressLabel
            labelKey='address_component.house_number'
            id={`address_house_number_${id}`}
            language={language}
            required={required}
            readOnly={readOnly}
            labelSettings={labelSettings}
          />
          <p>{getLanguageFromKey('address_component.house_number_helper', language)}</p>
          <div className={'address-component-small-inputs'}>
            <TextField
              id={`address_house_number_${id}`}
              isValid={allValidations.houseNumber?.errors?.length === 0}
              value={houseNumber}
              onChange={updateField.bind(null, AddressKeys.houseNumber, false)}
              onBlur={updateField.bind(null, AddressKeys.houseNumber, true)}
              onPaste={() => onHouseNumberPaste()}
              readOnly={readOnly}
            />
          </div>
          {allValidations?.[AddressKeys.houseNumber]
            ? renderValidationMessagesForComponent(
                allValidations[AddressKeys.houseNumber],
                `${id}_${AddressKeys.houseNumber}`,
              )
            : null}
        </div>
      )}
    </div>
  );
}
