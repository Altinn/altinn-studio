import update from 'immutability-helper';
import * as React from 'react';

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
        <div>
          Adresse
          <br />
          <input value={adress} onChange={this.updateField.bind(null, AdressKeys.adress)} />
          <br />
          <br />
          Postnummer
          <input value={postNumber} onChange={this.updateField.bind(null, AdressKeys.postNumber)} />
          Poststed
          <input value={postPlace} onChange={this.updateField.bind(null, AdressKeys.postPlace)} />
          <br />
        </div>
      );
    }
    return (
      <div>
        Adresse
        <br />
        <input value={adress} onChange={this.updateField.bind(null, AdressKeys.adress)} />
        <br />
        c/o eller annen tilleggsadresse
        <br />
        <input value={careOf} onChange={this.updateField.bind(null, AdressKeys.careOf)} />
        <br />
        Postnummer
        <input value={postNumber} onChange={this.updateField.bind(null, AdressKeys.postNumber)} />
        Poststed
        <input value={postPlace} onChange={this.updateField.bind(null, AdressKeys.postPlace)} />
        <br />
        Bolignummer
        <br />
        Om adressen er felles for flere boenhenter må du oppgi bolignummer.
        Den består av en bokstav og fire tall og skal være ført opp ved/på inngangsdøren din.
        <br />
        <input value={houseNumber} onChange={this.updateField.bind(null, AdressKeys.houseNumber)} />
      </div>
    );
  }
}
