import * as React from 'react';

export interface ICheckboxContainerProps {
  id: string;
  component: IFormComponent;
  formData: any;
  handleDataChange: (value: any) => void;
  getTextResource: (resourceKey: string) => string;
  isValid: boolean;
  designMode: boolean;
}

export interface ICheckboxContainerState {
  selected: boolean;
}

export class CheckboxContainerComponent extends React.Component<ICheckboxContainerProps, ICheckboxContainerState> {

  public onDataChanged = (e: any) => {
    this.props.handleDataChange(!this.props.formData);
  }

  public render() {
    return (
      <div className={this.props.isValid ? 'form-group' : 'form-group validation-error'} id={this.props.id}>
        <div
          className={'pl-0 custom-control custom-control-stacked custom-checkbox a-custom-checkbox'}
          onClick={this.onDataChanged}
        >
          <input
            type='checkbox'
            checked={this.props.formData === true}
            name={this.props.component.id}
            className={this.props.isValid ? 'custom-control-input' : 'custom-control-input validation-error'}
          />
          <label className={'pl-3 custom-control-label a-fontBold'} htmlFor={this.props.component.id}>
            {this.props.designMode ? this.props.component.title : this.props.getTextResource(this.props.component.title)}
          </label>
        </div>
      </div>
    );
  }
}
