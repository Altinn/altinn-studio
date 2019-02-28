import * as React from 'react';
import { renderValidationMessagesForComponent } from '../../utils/render';

export interface IRadioButtonsContainerProps {
  id: string;
  component: IFormRadioButtonComponent;
  formData: any;
  handleDataChange: (value: any) => void;
  getTextResource: (resourceKey: string) => string;
  isValid?: boolean;
  validationMessages?: IComponentValidations;
  designMode: boolean;
}

export interface IRadioButtonsContainerState {
  selected: string;
}

export class RadioButtonContainerComponent
  extends React.Component<
  IRadioButtonsContainerProps,
  IRadioButtonsContainerState
  > {
  constructor(props: IRadioButtonsContainerProps, state: IRadioButtonsContainerState) {
    super(props, state);
    if (
      !this.props.formData &&
      this.props.component.preselectedOptionIndex &&
      this.props.component.options &&
      this.props.component.preselectedOptionIndex < this.props.component.options.length
    ) {
      const preselectedValue = this.props.component.options[this.props.component.preselectedOptionIndex].value;
      this.state = {
        selected: preselectedValue,
      };
    } else {
      this.state = {
        selected: this.props.formData ? this.props.formData : '',
      };
    }
  }

  public onDataChanged = (selectedValue: any) => {
    this.setState({
      selected: selectedValue,
    });
    this.props.handleDataChange(selectedValue);
  }

  public isOptionSelected = (option: string) => {
    return this.state.selected === option;
  }

  public render() {
    const { options } = this.props.component;
    const optionsLength = (options) ? options.length : 0;
    const isStacked: boolean = (optionsLength > 2);

    return (
      <div
        className={
          'form-check a-radioButtons pl-0'
          +
          (isStacked ?
            ' form-check-stacked' :
            ' form-check-inline'
          )
        }
        id={this.props.id}
        style={isStacked ? {} : {alignItems: 'start'}}
      >
        {options.map((option, index) => (
          <div
            className='custom-control custom-radio pl-0 pr-4 mr-3 a-custom-radio'
            key={index}
            onClick={this.onDataChanged.bind(this, option.value)}
          >
            <input
              type='radio'
              name={'radio-' + this.props.id + '-' + index}
              className='custom-control-input'
              checked={this.isOptionSelected(option.value)}
            />
            <label className='custom-control-label pl-3'>
              {this.props.designMode ? option.label : this.props.getTextResource(option.label)}
            </label>
            {this.props.validationMessages && this.isOptionSelected(option.value) &&
              renderValidationMessagesForComponent(this.props.validationMessages.simpleBinding,
                this.props.component.id)}
          </div>
        ))}
      </div>
    );
  }
}
