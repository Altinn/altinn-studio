import React, { ChangeEvent, useEffect, useState } from 'react';
import classes from './StudioSlider.module.css';
import cn from 'classnames';

type StudioSliderProps = {
  disabled?: boolean;
  sliderValue?: number;
  handleSliderChange: (newValue: number) => void;
};

/**
 * @component
 *    Component to select a value within the range 1 to 12. Adapted to select value for grid-property on layout components
 */
export const StudioSlider = ({
  disabled = false,
  sliderValue = 12,
  handleSliderChange,
}: StudioSliderProps) => {
  const [value, setValue] = useState<number>(sliderValue);
  const gridValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  useEffect(() => {
    setValue(sliderValue ?? 12);
  }, [sliderValue]);

  return (
    <div
      className={disabled ? cn(classes.sliderContainer, classes.disabled) : classes.sliderContainer}
    >
      <input
        className={disabled ? classes.disabled : undefined}
        type='range'
        min='1'
        max='12'
        id='range'
        value={sliderValue}
        list='gridValues'
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          handleSliderChange(parseInt(event.target.value))
        }
        onInput={(event: ChangeEvent<HTMLInputElement>) => setValue(parseInt(event.target.value))}
        disabled={disabled}
      />
      <datalist id='gridValues'>
        {gridValues.map((gridValue) => (
          <option
            key={gridValue}
            value={gridValue}
            label={gridValue.toString()}
            className={gridValue > value ? classes.outsideGrid : undefined}
          ></option>
        ))}
      </datalist>
    </div>
  );
};
