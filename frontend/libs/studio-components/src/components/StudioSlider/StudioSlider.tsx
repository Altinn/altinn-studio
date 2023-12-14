import React, { ChangeEvent } from 'react';
import classes from './StudioSlider.module.css';

type StudioSliderProps = {
  disabled?: boolean;
  sliderValue: string;
  handleSliderChange: (newValue: string) => void;
};

/**
 * @component
 *    Component to select a value within the range 1 to 12. Adapted to select value for grid-property on layout components
 */
export const StudioSlider = ({
  disabled = false,
  sliderValue = '12',
  handleSliderChange,
}: StudioSliderProps) => {
  const gridValues = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  return (
    <div className={classes.sliderContainer}>
      <div className={classes.range}>
        <input
          type='range'
          min='1'
          max='12'
          id='range'
          value={sliderValue}
          list='gridValues'
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            handleSliderChange(event.target.value)
          }
          disabled={disabled}
        />
        <datalist id='gridValues'>
          {gridValues.map((gridValue) => (
            <option key={gridValue} value={gridValue} label={gridValue}></option>
          ))}
        </datalist>
      </div>
      <div className={disabled ? classes.disabledSliderValue : classes.currentSliderValue}>
        {sliderValue}
      </div>
    </div>
  );
};
