import axios, { AxiosResponse } from 'axios';
import classNames = require('classnames');
import update from 'immutability-helper';
import * as React from 'react';

import '../../styles/AddressComponent.css';
import '../../styles/shared.css';
import { renderValidationMessagesForComponent } from '../../utils/render';

export interface IAddressComponentProps {
  component: IFormAddressComponent;
  formData: { [id: string]: string };
  handleDataChange: (value: any, key: string) => void;
  getTextResource: (key: string) => string;
  isValid?: boolean;
  simplified: boolean;
  validationMessages?: IComponentValidations;
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
  mounted: boolean;
}

export enum AddressKeys {
  address = 'address',
  zipCode = 'zipCode',
  postPlace = 'postPlace',
  careOf = 'careOf',
  houseNumber = 'houseNumber',
}

export class AddressComponent extends React.Component<IAddressComponentProps, IAddressComponentState> {
  constructor(_props: IAddressComponentProps) {
    super(_props);
    const formData = this.props.formData ? this.props.formData : {};
    this.state = {
      address: formData.address || '',
      zipCode: formData.zipCode || '',
      postPlace: formData.postPlace || '',
      careOf: formData.careOf || '',
      houseNumber: formData.houseNumber || '',
      validations: {
        zipCode: null,
        houseNumber: null,
      },
      mounted: false,
    };
    if (this.state.zipCode) {
      this.fetchPostPlace(this.state.zipCode);
    }
  }

  public componentWillUnmount: () => void = () => {
    this.setState({
      mounted: false,
    });
  }

  public componentDidMount: () => void = () => {
    this.setState({
      mounted: true,
    });
  }

  public fetchPostPlace: (zipCode: string) => void = (zipCode: string) => {
    if (zipCode.match(new RegExp('^[0-9]{4}$'))) {
      axios.get('https://api.bring.com/shippingguide/api/postalCode.json', {
        params: {
          clientUrl: window.location.href,
          pnr: zipCode,
        },
      }).then((response: AxiosResponse) => {
        if (response.data.valid && this.state.mounted) {
          this.setState({
            postPlace: response.data.result,
            validations: {
              zipCode: null,
            },
          }, () => {
            this.onBlurField(AddressKeys.postPlace);
          });
        } else if (this.state.mounted) {
          this.setState({
            postPlace: '',
            validations: {
              zipCode: 'Postnummer er ikke gyldig',
            },
          }, () => {
            this.onBlurField(AddressKeys.postPlace);
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
  }

  public onBlurField: (key: AddressKeys) => void = (key: AddressKeys) => {
    const validationErrors: IAddressValidationErrors = this.validate();
    if (!validationErrors.zipCode && !validationErrors.houseNumber) {
      this.props.handleDataChange(this.state[key], key);
      if (AddressKeys[key] === 'zipCode') {
        this.fetchPostPlace(this.state[key]);
      }
    }
    this.setState({
      validations: validationErrors,
    });
  }

  public joinValidationMessages = (): IComponentValidations => {
    const { validations } = this.state as any;
    let { validationMessages } = this.props;

    for (const fieldKey in validations) {
      if (!validations[fieldKey]) {
        continue;
      }

      if (!validationMessages) {
        validationMessages = {
          [fieldKey]: {
            errors: [],
            warnings: [],
          },
        };
      }

      if (validationMessages[fieldKey]) {
        validationMessages[fieldKey].errors.push(validations[fieldKey]);
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

  public render(): JSX.Element {
    const { component: { simplified, id } } = this.props;
    const { address, zipCode, postPlace, careOf, houseNumber } = this.state;

    const validations = this.joinValidationMessages();

    if (simplified) {
      return (
        <div className={'address-component'}>
          <label className={'address-component-label'}>
            {
              // This has been implemented for the sake of validating new textResource binding POC
              (!this.props.component.textResourceBindings.address) ? 'Adresse' :
                this.props.getTextResource(this.props.component.textResourceBindings.address)
            }
          </label>
          <input
            className={'form-control' + (this.props.component.readOnly ? ' disabled' : '')}
            value={address}
            onChange={this.updateField.bind(null, AddressKeys.address)}
            onBlur={this.onBlurField.bind(null, AddressKeys.address)}
            disabled={this.props.component.readOnly}
          />
          {validations ?
            renderValidationMessagesForComponent(validations[AddressKeys.address], `${id}_${AddressKeys.address}`)
            : null}
          <div className={'address-component-postplace-zipCode'}>
            <div className={'address-component-zipCode'}>
              <label className={'address-component-label'}>Postnummer</label>
              <input
                className={classNames('address-component-small-inputs', 'form-control',
                  {
                    'validation-error': (validations ? validations.zipCode : false),
                    'disabled': this.props.component.readOnly,
                  })}
                value={zipCode}
                onChange={this.updateField.bind(null, AddressKeys.zipCode)}
                onBlur={this.onBlurField.bind(null, AddressKeys.zipCode)}
                disabled={this.props.component.readOnly}
              />
              {validations ?
                renderValidationMessagesForComponent(validations[AddressKeys.zipCode], `${id}_${AddressKeys.zipCode}`)
                : null}
            </div>

            <div className={'address-component-postplace'}>
              <label className={'address-component-label'}>Poststed</label>
              <input
                className={classNames('form-control', { 'disabled': this.props.component.readOnly })}
                value={postPlace}
                onChange={this.updateField.bind(null, AddressKeys.postPlace)}
                onBlur={this.onBlurField.bind(null, AddressKeys.postPlace)}
                disabled={this.props.component.readOnly}
              />
              {validations ?
                renderValidationMessagesForComponent(validations[AddressKeys.postPlace],
                  `${id}_${AddressKeys.postPlace}`)
                : null}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className={'address-component'}>
        <label className={'address-component-label'}>{
          // This has been implemented for the sake of validating new textResource binding POC
          (!this.props.component.textResourceBindings.address) ? 'Adresse' :
            this.props.getTextResource(this.props.component.textResourceBindings.address)
        }</label>
        <input
          className={classNames('form-control', { 'disabled': this.props.component.readOnly })}
          value={address}
          onChange={this.updateField.bind(null, AddressKeys.address)}
          onBlur={this.onBlurField.bind(null, AddressKeys.address)}
        />
        {validations ?
          renderValidationMessagesForComponent(validations[AddressKeys.address], `${id}_${AddressKeys.address}`)
          : null}
        <label className={'address-component-label'}>c/o eller annen tilleggsadresse</label>
        <input
          className={classNames('form-control', { 'disabled': this.props.component.readOnly })}
          value={careOf}
          onChange={this.updateField.bind(null, AddressKeys.careOf)}
          onBlur={this.onBlurField.bind(null, AddressKeys.careOf)}
        />
        {validations ?
          renderValidationMessagesForComponent(validations[AddressKeys.careOf], `${id}_${AddressKeys.careOf}`)
          : null}
        <div className={'address-component-postplace-zipCode'}>
          <div className={'address-component-zipCode'}>
            <label className={'address-component-label'}>Postnummer</label>
            <br />
            <input
              className={classNames('address-component-small-inputs', 'form-control',
                {
                  'validation-error': (validations ? validations.zipCode : false),
                  'disabled': this.props.component.readOnly,
                })}
              value={zipCode}
              onChange={this.updateField.bind(null, AddressKeys.zipCode)}
              onBlur={this.onBlurField.bind(null, AddressKeys.zipCode)}
            />
            {validations ?
              renderValidationMessagesForComponent(validations[AddressKeys.zipCode], `${id}_${AddressKeys.zipCode}`)
              : null}
          </div>
          <div className={'address-component-postplace'}>
            <label className={'address-component-label'}>Poststed</label>
            <br />
            <input
              className={classNames('form-control', { 'disabled': this.props.component.readOnly })}
              value={postPlace}
              onChange={this.updateField.bind(null, AddressKeys.postPlace)}
              onBlur={this.onBlurField.bind(null, AddressKeys.postPlace)}
            />
            {validations ?
              renderValidationMessagesForComponent(validations[AddressKeys.postPlace], `${id}_${AddressKeys.postPlace}`)
              : null}
          </div>
        </div>
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
          className={classNames('address-component-small-inputs', 'form-control',
            {
              'validation-error': (validations ? validations.houseNumber : false),
              'disabled': this.props.component.readOnly,
            })}
          value={houseNumber}
          onChange={this.updateField.bind(null, AddressKeys.houseNumber)}
          onBlur={this.onBlurField.bind(null, AddressKeys.houseNumber)}
        />
        {validations ?
          renderValidationMessagesForComponent(validations[AddressKeys.houseNumber], `${id}_${AddressKeys.houseNumber}`)
          : null}
      </div>
    );
  }
}

export function getTextResourceByAddressKey(key: AddressKeys, language: any): string {
  switch (key) {
    case AddressKeys.address: {
      return language.ux_editor.modal_configure_address_component_address;
    }
    case AddressKeys.zipCode: {
      return language.ux_editor.modal_configure_address_component_zip_code;
    }
    case AddressKeys.houseNumber: {
      return language.ux_editor.modal_configure_address_component_house_number;
    }
    case AddressKeys.careOf: {
      return language.ux_editor.modal_configure_address_component_care_of;
    }
    case AddressKeys.postPlace: {
      return language.ux_editor.modal_configure_address_component_post_place;
    }
  }
}
