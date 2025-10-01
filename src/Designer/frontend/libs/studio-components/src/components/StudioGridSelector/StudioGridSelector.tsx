import type { ChangeEvent, MouseEvent } from 'react';
import React, { useEffect, useState, useId } from 'react';
import classes from './StudioGridSelector.module.css';
import cn from 'classnames';
import type { GridSize } from './types/GridSize';

export type StudioGridSelectorProps = {
  disabled?: boolean;
  sliderValue?: GridSize;
  handleSliderChange: (newValue: GridSize) => void;
};

export const StudioGridSelector = ({
  disabled = false,
  sliderValue = 12,
  handleSliderChange,
}: StudioGridSelectorProps): React.JSX.Element => {
  const inputId = useId();
  const listId = useId();
  const [hoverValue, setHoverValue] = useState<number>(0);
  const [selectedValue, setSelectedValue] = useState<number>(sliderValue);
  const gridValues: GridSize[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  useEffect(() => {
    setSelectedValue(sliderValue);
  }, [sliderValue]);

  const optionClassName = (gridValue: number): string => {
    const currentValue = hoverValue > 0 ? hoverValue : selectedValue;
    const variableClassName = gridValue > currentValue ? classes.outside : classes.inside;
    return cn(classes.option, variableClassName);
  };

  const handleHover = (event: MouseEvent<HTMLInputElement>): void => {
    const slider = event.currentTarget;
    const rect = slider.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    const percentage = relativeX / rect.width;
    const calculatedValue = Math.min(12, Math.max(1, Math.ceil(percentage * 12)));
    setHoverValue(calculatedValue);
  };

  const generateBackgroundStyle = (value: number, isHover: boolean): string => {
    const steps: string[] = [];
    const stepWidth = 100 / 12;
    const gapSize = 0.2;
    const selectedColor = isHover ? 'var(--hover-square-color)' : 'var(--selected-square-colour)';
    const unselectedColor = 'var(--unselected-square-colour)';
    const gapColor = 'white';

    for (let i = 1; i <= 12; i++) {
      const start = (i - 1) * stepWidth;
      const end = i * stepWidth - gapSize;
      const gapEnd = i * stepWidth;

      const color = i <= value ? selectedColor : unselectedColor;
      steps.push(`${color} ${start}%`);
      steps.push(`${color} ${end}%`);

      if (i < 12) {
        steps.push(`${gapColor} ${end}%`);
        steps.push(`${gapColor} ${gapEnd}%`);
      }
    }
    return `linear-gradient(to right, ${steps.join(', ')})`;
  };

  const currentValue = hoverValue > 0 ? hoverValue : selectedValue;
  const isHovered = hoverValue > 0;
  const backgroundStyle = generateBackgroundStyle(currentValue, isHovered);

  const convertToGridSize = (value: string): GridSize => {
    return parseInt(value) as GridSize;
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const newValue = parseInt(event.target.value);
    setSelectedValue(newValue);
    setHoverValue(0);
  };

  return (
    <div
      className={cn(classes.sliderContainer, disabled && classes.disabled)}
      style={{ '--background': backgroundStyle } as React.CSSProperties}
    >
      <input
        className={classes.range}
        type='range'
        min='1'
        max='12'
        id={inputId}
        value={sliderValue}
        list={listId}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          handleSliderChange(convertToGridSize(event.target.value))
        }
        onInput={handleInputChange}
        disabled={disabled}
        onMouseMove={handleHover}
        onMouseLeave={() => setHoverValue(0)}
      />
      <datalist id={listId}>
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
