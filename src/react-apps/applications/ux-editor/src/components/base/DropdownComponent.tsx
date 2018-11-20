import * as React from 'react';

export interface IDropdownProps {
  id: string;
  component: IFormComponent;
  formData: any;
  handleDataChange: (value: any) => void;
  getTextResource: (resourceKey: string) => string;
  isValid?: boolean;
  designMode: boolean;
}

export interface IDropdownState {
  title: string;
  options: IOptions[];
  name: string;
}

export class DropdownComponent
  extends React.Component<IDropdownProps, IDropdownState> {

  public onDataChanged = (e: any) => {
    this.props.handleDataChange(e.target.value);
  }

  public render() {
    const { options } = this.props.component;
    return (
      <select
        id={this.props.id}
        value={this.props.formData}
        className={this.props.isValid ? 'custom-select a-custom-select'
        : 'custom-select a-custom-select validation-error'}
        onChange={this.onDataChanged}
      >
        {options.map((option, index) => (
          <option key={index} value={option.value}>
            {this.props.designMode ? option.label : this.props.getTextResource(option.label)}
          </option>
        ))}
      </select>
    );
  }
}
