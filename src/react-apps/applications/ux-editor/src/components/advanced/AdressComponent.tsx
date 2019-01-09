import axios, { AxiosResponse } from 'axios';
import update from 'immutability-helper';
import * as React from 'react';

import '../../styles/AdressComponent.css';

export interface IAdressComponentProps {
  component: IFormComponent;
  formData: any;
  handleDataChange: (value: any) => void;
  isValid?: boolean;
  simplified: boolean;
}

interface IAdressValidationErrors {
  zipCode?: string;
  houseNumber?: string;
}

export interface IAdressComponentState {
  adress: string;
  zipCode: string;
  postPlace: string;
  careOf: string;
  houseNumber: string;
  validations: IAdressValidationErrors;
}

enum AdressKeys {
  adress,
  zipCode,
  postPlace,
  careOf,
  houseNumber,
}

export class AdressComponent extends React.Component<IAdressComponentProps, IAdressComponentState> {
  constructor(_props: IAdressComponentProps) {
    super(_props);
    this.state = {
      adress: '',
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

  public validate: () => IAdressValidationErrors = () => {
    const { zipCode, houseNumber } = this.state;
    const validationErrors: IAdressValidationErrors = {
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

  public updateField: (key: AdressKeys, event: any) => void = (key: AdressKeys, event: any): void => {
    const changedFieldValue: string = event.target.value;
    const changedKey: string = AdressKeys[key];
    this.setState((state: IAdressComponentState) => update(state, {
      [changedKey]: {
        $set: changedFieldValue,
      },
    }));
    if (AdressKeys[key] === 'zipCode') {
      this.fetchPostPlace(changedFieldValue);
    }
  }

  public onBlurField: () => void = () => {
    const { adress, zipCode, postPlace, careOf, houseNumber } = this.state;
    const validationErrors: IAdressValidationErrors = this.validate();
    if (!validationErrors.zipCode && !validationErrors.houseNumber) {
      if (adress !== '' && zipCode !== '' && postPlace !== '') {
        this.props.handleDataChange({
          adress,
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
    const { adress, zipCode, postPlace, careOf, houseNumber, validations } = this.state;

    if (simplified) {
      return (
        <div className={'adress-component'}>
          <label className={'adress-component-label'}>Adresse</label>
          <input
            className={'form-control'}
            value={adress}
            onChange={this.updateField.bind(null, AdressKeys.adress)}
            onBlur={this.onBlurField}
          />
          <div className={'adress-component-postplace-zipCode'}>
            <div className={'adress-component-zipCode'}>
              <label className={'adress-component-label'}>Postnummer</label>
              <input
                className={
                  !validations.zipCode ?
                    'adress-component-small-inputs form-control' :
                    'adress-component-small-inputs form-control validation-error'
                }
                value={zipCode}
                onChange={this.updateField.bind(null, AdressKeys.zipCode)}
                onBlur={this.onBlurField}
              />
            </div>
            <div className={'adress-component-postplace'}>
              <label className={'adress-component-label'}>Poststed</label>
              <input
                className={'form-control'}
                value={postPlace}
                onChange={this.updateField.bind(null, AdressKeys.postPlace)}
                onBlur={this.onBlurField}
              />
            </div>
          </div>
          {!validations.zipCode ?
            null :
            <label
              className={'adress-component-validation-label'}
            >
              {validations.zipCode}
            </label>
          }
        </div>
      );
    }
    return (
      <div className={'adress-component'}>
        <label className={'adress-component-label'}>Adresse</label>
        <input
          className={'form-control'}
          value={adress}
          onChange={this.updateField.bind(null, AdressKeys.adress)}
          onBlur={this.onBlurField}
        />
        <label className={'adress-component-label'}>c/o eller annen tilleggsadresse</label>
        <input
          className={'form-control'}
          value={careOf}
          onChange={this.updateField.bind(null, AdressKeys.careOf)}
          onBlur={this.onBlurField}
        />
        <div className={'adress-component-postplace-zipCode'}>
          <div className={'adress-component-zipCode'}>
            <label className={'adress-component-label'}>Postnummer</label>
            <br />
            <input
              className={
                !validations.zipCode ?
                  'adress-component-small-inputs form-control' :
                  'adress-component-small-inputs form-control validation-error'
              }
              value={zipCode}
              onChange={this.updateField.bind(null, AdressKeys.zipCode)}
              onBlur={this.onBlurField}
            />
          </div>
          <div className={'adress-component-postplace'}>
            <label className={'adress-component-label'}>Poststed</label>
            <br />
            <input
              className={'form-control'}
              value={postPlace}
              onChange={this.updateField.bind(null, AdressKeys.postPlace)}
              onBlur={this.onBlurField}
            />
          </div>
        </div>
        {!validations.zipCode ?
          null :
          <label
            className={'adress-component-validation-label'}
          >
            {validations.zipCode}
          </label>
        }
        <label className={'adress-component-label'}>
          Bolignummer
          <label className={'adress-component-label-smaller'}>
            <span>&nbsp;</span>(Valgfri)
          </label>
        </label>
        <p>
          Om adressen er felles for flere boenhenter må du oppgi bolignummer.
          Den består av en bokstav og fire tall og skal være ført opp ved/på inngangsdøren din.
        </p>
        <input
          className={
            !validations.houseNumber ?
              'adress-component-small-inputs form-control' :
              'adress-component-small-inputs form-control validation-error'
          }
          value={houseNumber}
          onChange={this.updateField.bind(null, AdressKeys.houseNumber)}
          onBlur={this.onBlurField}
        />
        {!validations.houseNumber ?
          null :
          <label
            className={'adress-component-validation-label'}
          >
            {validations.houseNumber}
          </label>
        }
      </div>
    );
  }
}
