import classNames = require('classnames');
import * as React from 'react';
import '../../styles/CheckboxComponent.css';
import { renderValidationMessagesForComponent } from '../../utils/render';

export interface ICheckboxContainerProps {
  id: string;
  component: IFormCheckboxComponent;
  formData: any;
  handleDataChange: (value: any) => void;
  getTextResource: (resourceKey: string) => string;
  isValid: boolean;
  validationMessages: IComponentValidations;
  designMode: boolean;
}

export interface ICheckboxContainerState {
  selected: string[];
}

export class CheckboxContainerComponent extends React.Component<ICheckboxContainerProps, ICheckboxContainerState> {

  constructor(props: ICheckboxContainerProps, state: ICheckboxContainerState) {
    super(props, state);
    if (
      !this.props.formData &&
      this.props.component.preselectedOptionIndex &&
      this.props.component.options &&
      this.props.component.preselectedOptionIndex < this.props.component.options.length
    ) {
      const selected: string[] = [];
      selected[props.component.preselectedOptionIndex] =
        props.component.options[this.props.component.preselectedOptionIndex].value;
      this.state = {
        selected,
      };
    } else {
      this.state = {
        selected: this.props.formData ? this.props.formData.split(',') : [],
      };
    }
  }

  public onDataChanged = (selectedValue: any, index: number) => {
    const newSelected = this.state.selected;
    if (newSelected[index] === selectedValue) {
      newSelected[index] = '';
    } else {
      newSelected[index] = selectedValue;
    }
    this.setState({
      selected: newSelected,
    });
    this.props.handleDataChange(newSelected.join());
  }

  public isOptionSelected = (option: string) => {
    return this.state.selected.includes(option);
  }

  public emptyFunction = (): string => {
    return undefined;
  }

  public render() {
    const { options } = this.props.component;
    const optionsLength = (options) ? options.length : 0;
    const isStacked: boolean = (optionsLength > 2);
    return (
      <div
        className={
          'form-check a-form-checkboxes pl-0' +
          (isStacked ?
            ' form-check-stacked' :
            ' form-check-inline'
          )
        }
        id={this.props.id}
        style={isStacked ? {} : { alignItems: 'start' }}
      >
        {options.map((option, index) => (
          <div
            key={index}
            className={classNames('custom-control', 'custom-checkbox', 'a-custom-checkbox', 'pl-0', 'pr-4 mr-3',
              { 'no-cursor': this.props.component.readOnly })}
            onClick={this.props.component.readOnly ? null : this.onDataChanged.bind(this, option.value, index)}
          >
            <input
              type='checkbox'
              className='custom-control-input'
              value={option.value}
              name={'checkbox-' + this.props.id + '-' + index}
              checked={this.isOptionSelected(option.value)}
              onChange={this.emptyFunction}
            />
            <label
              className={classNames('custom-control-label', 'pl-3',
                { 'disabled-checkbox no-cursor': this.props.component.readOnly })}
            >
              {option.label}
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
