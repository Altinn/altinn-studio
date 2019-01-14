import axios, { AxiosResponse } from 'axios';
import update from 'immutability-helper';
import * as React from 'react';

import '../../styles/AddressComponent.css';

export interface IAddressComponentProps {
  component: IFormAddressComponent;
  formData: any;
  handleDataChange: (value: any) => void;
  isValid?: boolean;
  simplified: boolean;
}

interface IAddressValidationErrors {
  zipCode?: string;
  houseNumber?: string;
}

export interface IAddressComponentState {
  address: string;
  zipCode: string;
  postPlace: string;
  careOf: string;
  houseNumber: string;
  validations: IAddressValidationErrors;
}

enum AddressKeys {
  address,
  zipCode,
  postPlace,
  careOf,
  houseNumber,
}

export class AddressComponent extends React.Component<IAddressComponentProps, IAddressComponentState> {
  constructor(_props: IAddressComponentProps) {
    super(_props);
    this.state = {
      address: '',
      zipCode: '',
      postPlace: '',
      careOf: '',
      houseNumber: '',
      validations: {
        zipCode: null,
        houseNumber: null,
      },
    };
  }

  public fetchPostPlace: (zipCode: string) => void = (zipCode: string) => {
    if (zipCode.match(new RegExp('^[0-9]{4}$'))) {
      axios.get('https://api.bring.com/shippingguide/api/postalCode.json', {
        params: {
          clientUrl: window.location.href,
          pnr: zipCode,
        },
      }).then((response: AxiosResponse) => {
        if (response.data.valid) {
          this.setState({
            postPlace: response.data.result,
            validations: {
              zipCode: null,
            },
          });
        } else {
          this.setState({
            postPlace: '',
            validations: {
              zipCode: 'Postnummer er ikke gyldig',
            },
          });
        }
      });
      this.setState({
        postPlace: 'Laster...',
      });
    }
  }

  public validate: () => IAddressValidationErrors = () => {
    const { zipCode, houseNumber } = this.state;
    const validationErrors: IAddressValidationErrors = {
      zipCode: null,
      houseNumber: null,
    };
    if (!zipCode.match(new RegExp('^[0-9]{4}$')) && zipCode !== '') {
      validationErrors.zipCode = 'Postnummer er ikke gyldig';
    } else {
      validationErrors.zipCode = null;
    }
    if (!houseNumber.match(new RegExp('^[a-z,A-Z]{1}[0-9]{4}$')) && houseNumber !== '') {
      validationErrors.houseNumber = 'Bolignummer er ikke gyldig';
    } else {
      validationErrors.houseNumber = null;
    }
    return validationErrors;
  }

  public updateField: (key: AddressKeys, event: any) => void = (key: AddressKeys, event: any): void => {
    const changedFieldValue: string = event.target.value;
    const changedKey: string = AddressKeys[key];
    this.setState((state: IAddressComponentState) => update(state, {
      [changedKey]: {
        $set: changedFieldValue,
      },
    }));
    if (AddressKeys[key] === 'zipCode') {
      this.fetchPostPlace(changedFieldValue);
    }
  }

  public onBlurField: () => void = () => {
    const { address, zipCode, postPlace, careOf, houseNumber } = this.state;
    const validationErrors: IAddressValidationErrors = this.validate();
    if (!validationErrors.zipCode && !validationErrors.houseNumber) {
      if (address !== '' && zipCode !== '' && postPlace !== '') {
        this.props.handleDataChange({
          address,
          zipCode,
          postPlace,
          careOf,
          houseNumber,
        });
      }
    }
    this.setState({
      validations: validationErrors,
    });
  }

  public render(): JSX.Element {
    const { component: { simplified } } = this.props;
    const { address, zipCode, postPlace, careOf, houseNumber, validations } = this.state;

    if (simplified) {
      return (
        <div className={'address-component'}>
          <label className={'address-component-label'}>Adresse</label>
          <input
            className={'form-control'}
            value={address}
            onChange={this.updateField.bind(null, AddressKeys.address)}
            onBlur={this.onBlurField}
          />
          <div className={'address-component-postplace-zipCode'}>
            <div className={'address-component-zipCode'}>
              <label className={'address-component-label'}>Postnummer</label>
              <input
                className={
                  !validations.zipCode ?
                    'address-component-small-inputs form-control' :
                    'address-component-small-inputs form-control validation-error'
                }
                value={zipCode}
                onChange={this.updateField.bind(null, AddressKeys.zipCode)}
                onBlur={this.onBlurField}
              />
            </div>
            <div className={'address-component-postplace'}>
              <label className={'address-component-label'}>Poststed</label>
              <input
                className={'form-control'}
                value={postPlace}
                onChange={this.updateField.bind(null, AddressKeys.postPlace)}
                onBlur={this.onBlurField}
              />
            </div>
          </div>
          {!validations.zipCode ?
            null :
            <label
              className={'address-component-validation-label'}
            >
              {validations.zipCode}
            </label>
          }
        </div>
      );
    }
    return (
      <div className={'address-component'}>
        <label className={'address-component-label'}>Adresse</label>
        <input
          className={'form-control'}
          value={address}
          onChange={this.updateField.bind(null, AddressKeys.address)}
          onBlur={this.onBlurField}
        />
        <label className={'address-component-label'}>c/o eller annen tilleggsadresse</label>
        <input
          className={'form-control'}
          value={careOf}
          onChange={this.updateField.bind(null, AddressKeys.careOf)}
          onBlur={this.onBlurField}
        />
        <div className={'address-component-postplace-zipCode'}>
          <div className={'address-component-zipCode'}>
            <label className={'address-component-label'}>Postnummer</label>
            <br />
            <input
              className={
                !validations.zipCode ?
                  'address-component-small-inputs form-control' :
                  'address-component-small-inputs form-control validation-error'
              }
              value={zipCode}
              onChange={this.updateField.bind(null, AddressKeys.zipCode)}
              onBlur={this.onBlurField}
            />
          </div>
          <div className={'address-component-postplace'}>
            <label className={'address-component-label'}>Poststed</label>
            <br />
            <input
              className={'form-control'}
              value={postPlace}
              onChange={this.updateField.bind(null, AddressKeys.postPlace)}
              onBlur={this.onBlurField}
            />
          </div>
        </div>
        {!validations.zipCode ?
          null :
          <label
            className={'address-component-validation-label'}
          >
            {validations.zipCode}
          </label>
        }
        <label className={'address-component-label'}>
          Bolignummer
          <label className={'address-component-label-smaller'}>
            <span>&nbsp;</span>(Valgfri)
          </label>
        </label>
        <p>
          Om addressen er felles for flere boenhenter må du oppgi bolignummer.
          Den består av en bokstav og fire tall og skal være ført opp ved/på inngangsdøren din.
        </p>
        <input
          className={
            !validations.houseNumber ?
              'address-component-small-inputs form-control' :
              'address-component-small-inputs form-control validation-error'
          }
          value={houseNumber}
          onChange={this.updateField.bind(null, AddressKeys.houseNumber)}
          onBlur={this.onBlurField}
        />
        {!validations.houseNumber ?
          null :
          <label
            className={'address-component-validation-label'}
          >
            {validations.houseNumber}
          </label>
        }
      </div>
    );
  }
}
