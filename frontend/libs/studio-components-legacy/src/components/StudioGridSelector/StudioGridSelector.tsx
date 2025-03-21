import type { ChangeEvent, MouseEvent } from 'react';
import React, { useEffect, useRef, useState } from 'react';
import classes from './StudioGridSelector.module.css';
import cn from 'classnames';
import type { GridSize } from './types/GridSize';

type OptionData = {
  value: GridSize;
  positionX: number;
};

type StudioGridSelectorProps = {
  disabled?: boolean;
  sliderValue?: GridSize;
  handleSliderChange: (newValue: GridSize) => void;
};

/**
 * @component
 *    A component designed for choosing a value within the range of 1 to 12
 */
export const StudioGridSelector = ({
  disabled = false,
  sliderValue = 12,
  handleSliderChange,
}: StudioGridSelectorProps) => {
  const [hoverValue, setHoverValue] = useState<number>(0);
  const [selectedValue, setSelectedValue] = useState<number>(sliderValue);
  const gridValues: GridSize[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  useEffect(() => {
    setSelectedValue(sliderValue);
  }, [sliderValue]);

  const optionClassName = (gridValue: number) => {
    let variableClassName = gridValue > selectedValue ? classes.outside : classes.inside;
    if (hoverValue > 0) {
      variableClassName = gridValue > hoverValue ? classes.outside : classes.inside;
    }
    return cn(classes.option, variableClassName);
  };

  const sliderIsHovered = hoverValue > 0;
  const backgroundCss =
    'linear-gradient(\n' +
    generateLinearGradient(sliderIsHovered ? hoverValue : selectedValue, sliderIsHovered) +
    ')';

  const inputRef = useRef(null);

  const handleHover = (event: MouseEvent<HTMLInputElement>) => {
    const dataListElement = inputRef.current.list;
    const optionPositionsX: OptionData[] = calculateOptionPositionsX(dataListElement);
    const hoverOption = [...optionPositionsX]
      .reverse()
      .find((optionPosX) => optionPosX.positionX < event.clientX);
    setHoverValue(hoverOption?.value || 0);
  };

  return (
    <div
      className={cn(classes.sliderContainer, disabled && classes.disabled)}
      style={{ '--background': backgroundCss } as React.CSSProperties}
    >
      <input
        ref={inputRef}
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
        onInput={(event: ChangeEvent<HTMLInputElement>) => {
          setSelectedValue(parseInt(event.target.value));
          setHoverValue(0);
        }}
        disabled={disabled}
        onMouseMove={handleHover}
        onMouseLeave={() => setHoverValue(0)}
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

const generateLinearGradient = (gridValue: number, hover: boolean): string => {
  const gradientLines: string[] = ['to right'];
  const gap = '1px';
  const insideColour = hover ? 'var(--hover-square-color)' : 'var(--selected-square-colour)';
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

const calculateOptionPositionsX = (datalistElement: HTMLDataListElement): OptionData[] => {
  if (datalistElement) {
    return Array.from(datalistElement.options).map((option: HTMLOptionElement): OptionData => {
      const optionRect = option.getBoundingClientRect();
      return {
        value: parseInt(option.value) as GridSize,
        positionX: optionRect.x,
      };
    });
  }
};
