import classNames = require('classnames');
import * as React from 'react';
import '../../styles/RadioButtonComponent.css';
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

export const RadioButtonContainerComponent = (props: IRadioButtonsContainerProps) => {
  const [selected, setSelected] = React.useState('');
  const { options } = props.component;
  const optionsLength = (options) ? options.length : 0;
  const isStacked: boolean = (optionsLength > 2);

  React.useEffect(() => {
    returnSelected();
  }, [props]);

  const returnSelected = () => {
    if (
      !props.formData &&
      props.component.preselectedOptionIndex &&
      props.component.options &&
      props.component.preselectedOptionIndex < props.component.options.length
    ) {
      const preselectedValue = props.component.options[props.component.preselectedOptionIndex].value;
      setSelected(preselectedValue);
    } else {
      setSelected(props.formData ? props.formData : '');
    }
  };

  const onDataChange = (selectedValue: any) => {
    setSelected(selectedValue);
    props.handleDataChange(selectedValue);
  };

  const emptyFunction = React.useCallback(() => {
    return undefined;
  }, []);

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
      id={props.id}
      style={isStacked ? {} : { alignItems: 'start' }}
    >
      {options.map((option, index) => (
        <div
          className={'custom-control custom-radio pl-0 pr-4 mr-3 a-custom-radio'
            + (props.component.readOnly ? ' no-cursor' : '')}
          key={index}
          onClick={props.component.readOnly ?
            null : () => onDataChange(option.value)}
        >
          <input
            type='radio'
            name={'radio-' + props.id + '-' + index}
            className='custom-control-input'
            checked={selected === option.value}
            onChange={emptyFunction}
          />
          <label
            className={classNames('custom-control-label', 'pl-3',
              { 'disabled-radio-button': props.component.readOnly })}
          >
            {props.designMode ? option.label : props.getTextResource(option.label)}
          </label>
          {props.validationMessages && (selected === option.value) &&
            renderValidationMessagesForComponent(props.validationMessages.simpleBinding,
              props.component.id)}
        </div>
      ))}
    </div>
  );
};
