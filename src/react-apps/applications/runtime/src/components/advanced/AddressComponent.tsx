import axios from 'axios';
import classNames = require('classnames');
import update from 'immutability-helper';
import * as React from 'react';
import { getLanguageFromKey } from '../../../../shared/src/utils/language';
import { get } from '../../../../shared/src/utils/networking';
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
  language: any;
  textResourceBindings: ITextResourceBindings;
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

export enum AddressKeys {
  address = 'address',
  zipCode = 'zipCode',
  postPlace = 'postPlace',
  careOf = 'careOf',
  houseNumber = 'houseNumber',
}

export class AddressComponent extends React.Component<IAddressComponentProps, IAddressComponentState> {

  public cancelToken = axios.CancelToken;
  public source = this.cancelToken.source();

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
    };
  }

  public componentWillUnmount: () => void = () => {
    this.source.cancel('ComponentWillUnmount');
  }

  public fetchPostPlace: (zipCode: string) => void = async (zipCode: string) => {
    try {
      if (zipCode.match(new RegExp('^[0-9]{4}$'))) {
        const response = await get('https://api.bring.com/shippingguide/api/postalCode.json',
          {
            params: {
              clientUrl: window.location.href,
              pnr: zipCode,
            },
            cancelToken: this.source.token,
          });
        if (response.valid) {
          this.setState({
            postPlace: response.result,
            validations: {
              zipCode: null,
            },
          }, () => {
            this.onBlurField(AddressKeys.postPlace);
          });
        } else {
          this.setState({
            postPlace: '',
            validations: {
              zipCode: 'Postnummer er ikke gyldig',
            },
          });
        }
        this.setState({
          postPlace: 'Laster...',
        });
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        // Intentionally ignored
      } else {
        console.error(err);
      }
    }
  }

  public validate: () => IAddressValidationErrors = () => {
    const { zipCode, houseNumber } = this.state;
    const validationErrors: IAddressValidationErrors = {
      zipCode: null,
      houseNumber: null,
    };
    if (zipCode !== null && zipCode !== '' && !zipCode.match(new RegExp('^[0-9]{4}$'))) {
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
      if (key === AddressKeys.zipCode) {
        this.fetchPostPlace(this.state[key]);
        return;
      }
      if (key === AddressKeys.postPlace) {
        this.props.handleDataChange(this.state[AddressKeys.zipCode], AddressKeys.zipCode);
      }
      this.props.handleDataChange(this.state[key], key);
    }
    this.setState({
      validations: validationErrors,
    });
  }

  public joinValidationMessages = (): IComponentValidations => {
    const { validations } = this.state as any;
    let { validationMessages } = this.props;
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

  public render(): JSX.Element {
    const { address, zipCode, postPlace, careOf, houseNumber } = this.state;
    const validations = this.joinValidationMessages();

    return(
      <div className={'address-component'}>
        {
          this.props.textResourceBindings.title ?
            <h4 className='mt-2'>{this.props.getTextResource(this.props.textResourceBindings.title)}</h4>
          : null
        }
        <label className={'address-component-label'}>
          {
            getLanguageFromKey('ux_editor.modal_configure_address_component_address', this.props.language)
          }
        </label>
        <input
          className={classNames('form-control',
            {
              'validation-error': (validations.address.errors.length),
              'disabled': this.props.readOnly,
            })}
          value={address}
          onChange={this.updateField.bind(null, AddressKeys.address)}
          onBlur={this.onBlurField.bind(null, AddressKeys.address)}
          disabled={this.props.readOnly}
        />
        {
          !this.props.simplified &&
          <>
          <label className={'address-component-label'}>
          {
            getLanguageFromKey('ux_editor.modal_configure_address_component_care_of', this.props.language)
          }
          </label>
          <input
            className={classNames('form-control',
              {
                'validation-error': (validations.careOf.errors.length),
                'disabled': this.props.readOnly,
              })}
            value={careOf}
            onChange={this.updateField.bind(null, AddressKeys.careOf)}
            onBlur={this.onBlurField.bind(null, AddressKeys.careOf)}
          />
          {validations ?
          renderValidationMessagesForComponent(validations[AddressKeys.careOf],
            `${this.props.id}_${AddressKeys.careOf}`)
          : null}
        </>
        }
        {validations ?
            renderValidationMessagesForComponent(validations[AddressKeys.address],
              `${this.props.id}_${AddressKeys.address}`)
            : null}
          <div className={'address-component-postplace-zipCode'}>
            <div className={'address-component-zipCode'}>
              <label className={'address-component-label'}>
                {
                  getLanguageFromKey('ux_editor.modal_configure_address_component_zip_code', this.props.language)
                }
              </label>
              <input
                className={classNames('address-component-small-inputs', 'form-control',
                  {
                    'validation-error': (validations.zipCode.errors.length),
                    'disabled': this.props.readOnly,
                  })}
                value={zipCode}
                onChange={this.updateField.bind(null, AddressKeys.zipCode)}
                onBlur={this.onBlurField.bind(null, AddressKeys.zipCode)}
                disabled={this.props.readOnly}
              />
              {validations ?
                renderValidationMessagesForComponent(validations[AddressKeys.zipCode],
                  `${this.props.id}_${AddressKeys.zipCode}`)
                : null}
            </div>

            <div className={'address-component-postplace'}>
              <label className={'address-component-label'}>
                {
                  getLanguageFromKey('ux_editor.modal_configure_address_component_post_place', this.props.language)
                }
              </label>
              <input
                className={classNames('form-control',
                  {
                    'validation-error': (validations.postPlace.errors.length),
                    'disabled': this.props.readOnly,
                  })}
                value={postPlace}
                onChange={this.updateField.bind(null, AddressKeys.postPlace)}
                onBlur={this.onBlurField.bind(null, AddressKeys.postPlace)}
                disabled={this.props.readOnly}
              />
              {validations ?
                renderValidationMessagesForComponent(validations[AddressKeys.postPlace],
                  `${this.props.id}_${AddressKeys.postPlace}`)
                : null}
            </div>
          </div>
          {  !this.props.simplified &&
            <>
            <label className={'address-component-label'}>
              {
                getLanguageFromKey('ux_editor.modal_configure_address_component_house_number', this.props.language)
              }
              <label className={'address-component-label-smaller'}>
                <span>&nbsp;</span>({
                  getLanguageFromKey('general.optional', this.props.language)
                })
              </label>
            </label>
            <p>
              {
                getLanguageFromKey('ux_editor.modal_configure_address_component_house_number_helper',
                this.props.language)
              }
            </p>
            <input
              className={classNames('address-component-small-inputs', 'form-control',
                {
                  'validation-error': (validations.houseNumber.errors.length),
                  'disabled': this.props.readOnly,
                })}
              value={houseNumber}
              onChange={this.updateField.bind(null, AddressKeys.houseNumber)}
              onBlur={this.onBlurField.bind(null, AddressKeys.houseNumber)}
            />
            {validations ?
              renderValidationMessagesForComponent(validations[AddressKeys.houseNumber],
                `${this.props.id}_${AddressKeys.houseNumber}`)
              : null}
            </>
          }
      </div>
    );
  }
}
