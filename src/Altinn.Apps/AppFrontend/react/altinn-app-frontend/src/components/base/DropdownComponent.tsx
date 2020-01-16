import * as React from 'react';

export interface IDropdownProps {
  formData: any;
  getTextResource: (resourceKey: string) => string;
  handleDataChange: (value: any) => void;
  id: string;
  isValid?: boolean;
  options: any[];
}

export interface IDropdownState {
  title: string;
  options: any[];
  name: string;
}

export class DropdownComponent
  extends React.Component<IDropdownProps, IDropdownState> {

  public onDataChanged = (e: any) => {
    this.props.handleDataChange(e.target.value);
  }

  public render() {
    return (
      <select
        id={this.props.id}
        value={this.props.formData}
        className={this.props.isValid ? 'custom-select a-custom-select'
          : 'custom-select a-custom-select validation-error'}
        onChange={this.onDataChanged}
      >
        {this.props.options.map((option, index) => (
          <option key={index} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
}
