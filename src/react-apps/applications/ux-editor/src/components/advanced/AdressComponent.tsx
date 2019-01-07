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

export interface IAdressComponentState {
  adress: string;
  postNumber: number;
  postPlace: string;
  careOf: string;
  houseNumber: string;
}

enum AdressKeys {
  adress,
  postNumber,
  postPlace,
  careOf,
  houseNumber,
}

export class AdressComponent extends React.Component<IAdressComponentProps, IAdressComponentState> {
  constructor(_props: IAdressComponentProps) {
    super(_props);
    this.state = {
      adress: '',
      postNumber: null,
      postPlace: '',
      careOf: '',
      houseNumber: '',
    };
  }

  public updateField: (key: AdressKeys, event: any) => void = (key: AdressKeys, event: any): void => {
    const changedFieldValue = event.target.value;
    this.setState((state: IAdressComponentState) => update(state, {
      [AdressKeys[key]]: {
        $set: changedFieldValue,
      },
    }));
  }

  public render(): JSX.Element {
    const { component: { simplified } } = this.props;
    const { adress, postNumber, postPlace, careOf, houseNumber } = this.state;

    if (simplified) {
      return (
        <div className={'adress-component'}>
          <label className={'adress-component-label'}>Adresse</label>
          <input
            className={'form-control'}
            value={adress}
            onChange={this.updateField.bind(null, AdressKeys.adress)}
          />
          <div className={'adress-component-postplace-postnumber'}>
            <div className={'adress-component-postnumber'}>
              <label className={'adress-component-label'}>Postnummer</label>
              <input
                className={'adress-component-small-inputs form-control'}
                value={postNumber}
                onChange={this.updateField.bind(null, AdressKeys.postNumber)}
              />
            </div>
            <div className={'adress-component-postplace'}>
              <label className={'adress-component-label'}>Poststed</label>
              <input
                className={'form-control'}
                value={postPlace}
                onChange={this.updateField.bind(null, AdressKeys.postPlace)}
              />
            </div>
          </div>
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
        />
        <label className={'adress-component-label'}>c/o eller annen tilleggsadresse</label>
        <input
          className={'form-control'}
          value={careOf}
          onChange={this.updateField.bind(null, AdressKeys.careOf)}
        />
        <div className={'adress-component-postplace-postnumber'}>
          <div className={'adress-component-postnumber'}>
            <label className={'adress-component-label'}>Postnummer</label>
            <br />
            <input
              className={'adress-component-small-inputs form-control'}
              value={postNumber}
              onChange={this.updateField.bind(null, AdressKeys.postNumber)}
            />
          </div>
          <div className={'adress-component-postplace'}>
            <label className={'adress-component-label'}>Poststed</label>
            <br />
            <input
              className={'form-control'}
              value={postPlace}
              onChange={this.updateField.bind(null, AdressKeys.postPlace)}
            />
          </div>
        </div>
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
          className={'adress-component-small-inputs form-control'}
          value={houseNumber}
          onChange={this.updateField.bind(null, AdressKeys.houseNumber)}
        />
      </div>
    );
  }
}
