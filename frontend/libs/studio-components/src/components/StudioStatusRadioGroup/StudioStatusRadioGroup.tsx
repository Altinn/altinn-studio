import React, { type ReactElement } from 'react';
import styles from './StudioStatusRadioGroup.module.css';
import { StudioLabelAsParagraph } from '../StudioLabelAsParagraph';
import { StudioParagraph } from '../StudioParagraph';

interface RadioButton {
  title: string;
  text: string;
  color: 'red' | 'green' | 'blue';
  value: string;
}

export type StudioStatusRadioGroupProps = {
  options: RadioButton[];
  name: string; // For grouping radio buttons
  defaultValue?: string;
  onChange?: (value: string) => void;
};

export const StudioStatusRadioGroup = ({
  options,
  name,
  defaultValue,
  onChange,
}: StudioStatusRadioGroupProps): ReactElement => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(event.target.value);
    }
  };

  return (
    <div className={styles.radioGroup} role='radiogroup'>
      {options.map(({ title, text, color, value }) => {
        const inputId = `${name}-${value}`;
        return (
          <div key={value} className={`${styles.radioButton} ${styles[color]}`}>
            <input
              type='radio'
              id={inputId}
              name={name}
              value={value}
              defaultChecked={defaultValue === value}
              onChange={handleChange}
              className={styles.input}
              aria-labelledby={`${inputId}-title`}
              aria-describedby={`${inputId}-text`}
            />
            <label htmlFor={inputId} className={styles.content}>
              <StudioLabelAsParagraph id={`${inputId}-title`} className={styles.title}>
                {title}
              </StudioLabelAsParagraph>
              <StudioParagraph id={`${inputId}-text`} className={styles.text}>
                {text}
              </StudioParagraph>
            </label>
          </div>
        );
      })}
    </div>
  );
};
