import classNames = require('classnames');
import * as React from 'react';
import '../../styles/CheckboxComponent.css';
import { renderValidationMessagesForComponent } from '../../utils/render';

export interface ICheckboxContainerProps {
  id: string;
  formData: any;
  handleDataChange: (value: any) => void;
  getTextResource: (resourceKey: string) => string;
  isValid: boolean;
  validationMessages: any;
  options: any[];
  preselectedOptionIndex: number;
  readOnly: boolean;
}

export interface ICheckboxContainerState {
  selected: string[];
}

export class CheckboxContainerComponent extends React.Component<ICheckboxContainerProps, ICheckboxContainerState> {

  constructor(props: ICheckboxContainerProps, state: ICheckboxContainerState) {
    super(props, state);
    if (
      !this.props.formData &&
      this.props.preselectedOptionIndex &&
      this.props.options &&
      this.props.preselectedOptionIndex < this.props.options.length
    ) {
      const selected: string[] = [];
      selected[props.preselectedOptionIndex] =
        props.options[this.props.preselectedOptionIndex].value;
      this.state = {
        selected,
      };
    } else {
      this.state = {
        selected: this.props.formData ? this.props.formData.split(',') : [],
      };
    }
  }

  public onDataChanged = (selectedValue: any, index: number, label: string) => {
    const newSelected = this.state.selected;
    if (newSelected[index] === selectedValue) {
      newSelected[index] = '';
    } else {
      newSelected[index] = selectedValue;
    }
    this.setState({
      selected: newSelected,
    });
    let count = 0;
    for (const i in newSelected) {
      if (newSelected[i]) {
        count++;
      }
    }
    this.props.handleDataChange(count > 1 ? newSelected.join() : selectedValue);
  }

  public isOptionSelected = (option: string) => {
    return this.state.selected.includes(option);
  }

  public emptyFunction = (): string => {
    return undefined;
  }

  public render() {
    const isStacked: boolean = (this.props.options.length > 2);
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
        {this.props.options.map((option, index) => (
          <div
            key={index}
            className={classNames('custom-control', 'custom-checkbox', 'a-custom-checkbox', 'pl-0', 'pr-4 mr-3',
              { 'no-cursor': this.props.readOnly })}
            onClick={this.props.readOnly ? null : this.onDataChanged.bind(this, option.value, index, option.label)}
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
                { 'disabled-checkbox no-cursor': this.props.readOnly })}
            >
              {option.label}
            </label>
            {this.props.validationMessages && this.isOptionSelected(option.value) &&
              renderValidationMessagesForComponent(this.props.validationMessages.simpleBinding,
                this.props.id)}
          </div>
        ))}
      </div>
    );
  }
}
