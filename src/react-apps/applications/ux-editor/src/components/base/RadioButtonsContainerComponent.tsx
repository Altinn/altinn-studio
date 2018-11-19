import * as React from 'react';

export interface IRadioButtonsContainerProps {
  id: string;
  component: IFormComponent;
  formData: any;
  handleDataChange: (value: any) => void;
  getTextResource: (resourceKey: string) => string;
  isValid?: boolean;
  designMode: boolean;
}

export interface IRadioButtonsContainerState {
  selected: any;
}

export class RadioButtonContainerComponent
  extends React.Component<
  IRadioButtonsContainerProps,
  IRadioButtonsContainerState
  > {
  constructor(props: IRadioButtonsContainerProps, state: IRadioButtonsContainerState) {
    super(props, state);
    this.state = {
      selected: '',
    };
  }

  public onDataChanged = (selectedValue: any) => {
    this.setState({
      selected: selectedValue,
    });
    this.props.handleDataChange(selectedValue);
  }

  public render() {
    const { options } = this.props.component;
    return (
      <div className={this.props.isValid ? 'form-group' : 'form-group validation-error'} id={this.props.id}>
        {options.map((option, index) => (
          <div
            className='custom-control custom-radio pl-0 a-custom-radio custom-control-stacked'
            key={index}
            onClick={this.onDataChanged.bind(this, option.value)}
          >
            <input
              type='radio'
              name={'radio-' + this.props.id}
              className='custom-control-input'
              checked={this.state.selected === option.value}
            />
            <label className='custom-control-label pl-3 a-radioButtons-title'>
              {this.props.designMode ? option.label : this.props.getTextResource(option.label)}
            </label>
          </div>
        ))}
      </div>
    );
  }
}
