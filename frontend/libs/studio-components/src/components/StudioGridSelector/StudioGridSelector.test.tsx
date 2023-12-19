import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { StudioGridSelector } from './StudioGridSelector';

describe('StudioGridSelector', () => {
  it('should render slider with value 12 and not disabled by default', () => {
    render(<StudioGridSelector handleSliderChange={() => jest.fn()} />);

    const slider = screen.getByRole('slider');
    expect(slider).toHaveValue('12');
    expect(slider).not.toHaveAttribute('disabled');
  });

  it('should render slider as disabled when disabled is true', () => {
    render(<StudioGridSelector disabled={true} handleSliderChange={() => jest.fn()} />);

    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('disabled');
  });

  it('should render slider with correct value', () => {
    const sliderValue = 4;
    render(<StudioGridSelector sliderValue={sliderValue} handleSliderChange={() => jest.fn()} />);

    const slider = screen.getByRole('slider');
    expect(slider).toHaveValue(sliderValue.toString());
  });

  it('should render slider with lowest possible value when sliderValue is negative', () => {
    const sliderValue = -4;
    const lowestPossibleValue = 1;
    render(<StudioGridSelector sliderValue={sliderValue} handleSliderChange={() => jest.fn()} />);

    const slider = screen.getByRole('slider');
    expect(slider).toHaveValue(lowestPossibleValue.toString());
  });

  it('should render slider with highest possible value when sliderValue is too high', () => {
    const sliderValue = 14;
    const lowestPossibleValue = 12;
    render(<StudioGridSelector sliderValue={sliderValue} handleSliderChange={() => jest.fn()} />);

    const slider = screen.getByRole('slider');
    expect(slider).toHaveValue(lowestPossibleValue.toString());
  });

  it('should call onSliderChange when new value is clicked on slider', () => {
    const sliderValue = 4;
    const newSliderValue = 6;
    const onSliderChange = jest.fn();
    render(<StudioGridSelector sliderValue={sliderValue} handleSliderChange={onSliderChange} />);

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: newSliderValue } });

    expect(onSliderChange).toHaveBeenCalledWith(newSliderValue);
  });
});
