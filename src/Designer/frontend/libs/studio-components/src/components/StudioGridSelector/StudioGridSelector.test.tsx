import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { StudioGridSelector } from './StudioGridSelector';

describe('StudioGridSelector', () => {
  it('should render slider with value 12 and it is enabled by default', () => {
    render(<StudioGridSelector handleSliderChange={() => jest.fn()} />);

    const slider = screen.getByRole('slider');
    expect(slider).toHaveValue('12');
    expect(slider).not.toBeDisabled();
  });

  it('should render slider as disabled when disabled is true', () => {
    render(<StudioGridSelector disabled={true} handleSliderChange={() => jest.fn()} />);

    const slider = screen.getByRole('slider');
    expect(slider).toBeDisabled();
  });

  it('should render slider with correct value', () => {
    const sliderValue = 4;
    render(<StudioGridSelector sliderValue={sliderValue} handleSliderChange={() => jest.fn()} />);

    const slider = screen.getByRole('slider');
    expect(slider).toHaveValue(sliderValue.toString());
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

  it('should update internal state when sliderValue prop changes', () => {
    const { rerender } = render(
      <StudioGridSelector sliderValue={3} handleSliderChange={jest.fn()} />,
    );
    let slider = screen.getByRole('slider');
    expect(slider).toHaveValue('3');
    rerender(<StudioGridSelector sliderValue={9} handleSliderChange={jest.fn()} />);
    slider = screen.getByRole('slider');
    expect(slider).toHaveValue('9');
  });

  it('should convert string values to numbers correctly', () => {
    const handleSliderChangeMock = jest.fn();
    render(<StudioGridSelector handleSliderChange={handleSliderChangeMock} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '7' } });
    expect(handleSliderChangeMock).toHaveBeenCalledWith(7);
    expect(typeof handleSliderChangeMock.mock.calls[0][0]).toBe('number');
  });
});
