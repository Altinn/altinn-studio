import classNames = require('classnames');
import * as React from 'react';
import '../../styles/RadioButtonComponent.css';
import { renderValidationMessagesForComponent } from '../../utils/render';

export interface IRadioButtonsContainerProps {
  id: string;
  formData: any;
  handleDataChange: (value: any) => void;
  getTextResource: (resourceKey: string) => string;
  isValid?: boolean;
  validationMessages?: any;
  options: any[];
  preselectedOptionIndex: number;
  readOnly: boolean;
}

export interface IRadioButtonsContainerState {
  selected: string;
}

export const RadioButtonContainerComponent = (props: IRadioButtonsContainerProps) => {
  const [selected, setSelected] = React.useState('');
  const isStacked: boolean = (props.options.length > 2);

  React.useEffect(() => {
    returnSelected();
  }, [props]);

  const returnSelected = () => {
    if (
      !props.formData &&
      props.preselectedOptionIndex &&
      props.options &&
      props.preselectedOptionIndex < props.options.length
    ) {
      const preselectedValue = props.options[props.preselectedOptionIndex].value;
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
      className={classNames(
        'form-check',
        'a-radioButtons',
        'pl-0',
        {
          'form-check-stacked': isStacked,
          'form-check-inline': !isStacked,
        },
      )}
      id={props.id}
      style={isStacked ? {} : { alignItems: 'start' }}
    >
      {props.options.map((option: any, index: number) => (
        <div
          className={'custom-control custom-radio pl-0 pr-4 mr-3 a-custom-radio'
            + (props.readOnly ? ' no-cursor' : '')}
          key={index}
          onClick={props.readOnly ?
            null : () => onDataChange(option.value)}
          style={index !== 0 && props.options.length > 2 ? { marginTop: '2.4rem' } : {}}
        >
          <input
            type='radio'
            name={'radio-' + props.id + '-' + index}
            className='custom-control-input'
            checked={selected === option.value}
            onChange={emptyFunction}
          />
          <label
            className={classNames(
              'custom-control-label',
              'pl-3',
              {
                'disabled-radio-button': props.readOnly,
              },
            )}
          >
            {option.label}
          </label>
          {props.validationMessages && (selected === option.value) &&
            renderValidationMessagesForComponent(props.validationMessages.simpleBinding,
              props.id)}
        </div>
      ))}
    </div>
  );
};
