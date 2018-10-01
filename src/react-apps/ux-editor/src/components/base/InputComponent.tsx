import * as React from 'react';
import '../../styles/InputComponent.css';

export interface IInputProps {
  id: string;
  component: IFormComponent;
  formData: any;
  handleDataChange: (value: any) => void;
  isValid?: boolean;
}

export interface IInputState { }

export class InputComponent
  extends React.Component<IInputProps, IInputState> {

  public onDataChanged = (e: any) => {
    this.props.handleDataChange(e.target.value);
  }

  public render() {
    return (
      <input
        id={this.props.id}
        type={this.props.component.type as any}
        onBlur={this.onDataChanged}
        onChange={this.onDataChanged}
        disabled={this.props.component.disabled}
        required={this.props.component.required}
        className={this.props.isValid ? 'form-control' : 'form-control validation-error'}
        value={this.props.formData}
      />
    );
  }
}
