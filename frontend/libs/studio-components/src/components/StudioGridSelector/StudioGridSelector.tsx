import React, { ChangeEvent, useEffect, useState } from 'react';
import classes from './StudioGridSelector.module.css';
import cn from 'classnames';
import { GridSize } from './types/GridSize';

type StudioGridSelectorProps = {
  disabled?: boolean;
  sliderValue?: GridSize;
  handleSliderChange: (newValue: GridSize) => void;
};

/**
 * @component
 *    Component to select a value within the range 1 to 12. Adapted to select value for grid-property on layout components
 */
export const StudioGridSelector = ({
  disabled = false,
  sliderValue = 12,
  handleSliderChange,
}: StudioGridSelectorProps) => {
  const [value, setValue] = useState<number>(sliderValue);
  const gridValues: GridSize[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  useEffect(() => {
    setValue(sliderValue ?? 12);
  }, [sliderValue]);

  const optionClassName = (gridValue: number) =>
    cn(classes.option, gridValue > value ? classes.outside : classes.inside);

  const backgroundCss = 'linear-gradient(\n' + generateLinearGradient(value) + ')';

  return (
    <div
      className={cn(classes.sliderContainer, disabled && classes.disabled)}
      style={{ '--background': backgroundCss } as React.CSSProperties}
    >
      <input
        className={classes.range}
        type='range'
        min='1'
        max='12'
        id='range'
        value={sliderValue}
        list='gridValues'
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          handleSliderChange(convertToGridSize(event.target.value))
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
            className={optionClassName(gridValue)}
          />
        ))}
      </datalist>
    </div>
  );
};

const generateLinearGradient = (gridValue: number): string => {
  const gradientLines: string[] = ['to right'];
  const gap = '2px';
  const insideColour = 'var(--selected-square-colour)';
  const outsideColour = 'var(--unselected-square-colour)';
  const gapColour = 'white';
  const totalBgWidth = `(100% + ${gap})`;

  const createStep = (option: number) => {
    const startSquarePosition = `calc(${totalBgWidth} * ${option - 1} / 12)`;
    const endSquarePosition = `calc(${totalBgWidth} * ${option} / 12 - ${gap})`;
    const endGapPosition = `calc(${totalBgWidth} * ${option} / 12)`;
    const squareColour = option <= gridValue ? insideColour : outsideColour;
    const startSquareLine = `${squareColour} ${startSquarePosition}`;
    const endSquareLine = `${squareColour} ${endSquarePosition}`;
    const startGapLine = `${gapColour} ${endSquarePosition}`;
    const endGapLine = `${gapColour} ${endGapPosition}`;
    return [startSquareLine, endSquareLine, startGapLine, endGapLine].join(',\n');
  };

  for (let i = 1; i <= 12; i++) {
    gradientLines.push(createStep(i));
  }

  return gradientLines.join(',\n');
};

const convertToGridSize = (value: string): GridSize => {
  const int = parseInt(value);
  return int as GridSize;
};
