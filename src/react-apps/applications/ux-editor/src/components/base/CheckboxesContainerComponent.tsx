import * as React from 'react';

export interface ICheckboxContainerProps {
  id: string;
  component: IFormCheckboxComponent;
  formData: any;
  handleDataChange: (value: any) => void;
  getTextResource: (resourceKey: string) => string;
  isValid: boolean;
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
          ) +
          (this.props.isValid ?
            '' :
            ' validation-error'
          )
        }
        id={this.props.id}
      >
        {options.map((option, index) => (
          <div
            key={index}
            className='custom-control custom-checkbox a-custom-checkbox pl-0 pr-4 mr-3'
            onClick={this.onDataChanged.bind(this, option.value, index)}
          >
            <input
              type='checkbox'
              className='custom-control-input'
              value={option.value}
              name={'checkbox-' + this.props.id + '-' + index}
              checked={
                this.state.selected[index] === option.value
              }
            />
            <label className='pl-3 custom-control-label'>{option.label}</label>
          </div>
        ))}
      </div>
    );
  }
}
