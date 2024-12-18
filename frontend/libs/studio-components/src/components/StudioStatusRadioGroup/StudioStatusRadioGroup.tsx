import React, { type ChangeEvent, type ReactElement } from 'react';
import classes from './StudioStatusRadioGroup.module.css';
import cn from 'classnames';
import { StudioLabelAsParagraph } from '../StudioLabelAsParagraph';
import { StudioParagraph } from '../StudioParagraph';

type StudioStatusRadioButtonColor = 'success' | 'info';

export type StudioStatusRadioButtonItem = {
  title: string;
  text: string;
  color: StudioStatusRadioButtonColor;
  value: string;
};

export type StudioStatusRadioGroupProps = {
  options: StudioStatusRadioButtonItem[];
  title: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
};

export const StudioStatusRadioGroup = ({
  options,
  title: name,
  defaultValue,
  onChange,
}: StudioStatusRadioGroupProps): ReactElement => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(event.target.value);
    }
  };

  return (
    <div className={classes.radioGroupContainer}>
      <StudioLabelAsParagraph size='md'>{name}</StudioLabelAsParagraph>
      <div className={classes.radioGroup} role='radiogroup'>
        {options.map(({ title, text, color, value }: StudioStatusRadioButtonItem) => {
          const inputId = `${name}-${value}`;
          const inputTitleId = `${inputId}-title`;
          const inputTextId = `${inputId}-text`;
          return (
            <label key={value} className={cn(classes.radioButton, classes[color])}>
              <input
                type='radio'
                id={inputId}
                name={name}
                value={value}
                defaultChecked={defaultValue === value}
                onChange={handleChange}
                className={classes.input}
                aria-labelledby={inputTitleId}
                aria-describedby={inputTextId}
              />
              <div className={classes.textContent}>
                <StudioLabelAsParagraph id={inputTitleId} className={classes.title} size='sm'>
                  {title}
                </StudioLabelAsParagraph>
                <StudioParagraph id={inputTextId} className={classes.text} size='xs'>
                  {text}
                </StudioParagraph>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
};
