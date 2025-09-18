import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { StudioGridSelector } from './StudioGridSelector';
import userEvent from '@testing-library/user-event';

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

  it('should update hover value and background on mouse move', async () => {
    const user = userEvent.setup();
    render(<StudioGridSelector handleSliderChange={jest.fn()} />);
    const slider = screen.getByRole('slider') as HTMLInputElement;
    const mockGetBoundingClientRect = jest.fn(() => ({
      left: 0,
      width: 120,
      top: 0,
      right: 120,
      bottom: 20,
      height: 20,
      x: 0,
      y: 0,
      toJSON: (): Record<string, unknown> => ({}),
    })) as jest.MockedFunction<() => DOMRect>;
    slider.getBoundingClientRect = mockGetBoundingClientRect;
    await user.hover(slider);
    await user.pointer([{ target: slider, coords: { clientX: 60 } }]);
    await user.unhover(slider);
    expect(mockGetBoundingClientRect).toHaveBeenCalled();
  });

  it('Should call handleSliderChange on change', () => {
    const onChange = jest.fn();
    render(<StudioGridSelector handleSliderChange={onChange} />);
    const input = screen.getByRole('slider');
    fireEvent.input(input, { target: { value: '5' } });
    expect(onChange).toHaveBeenCalledWith(5);
  });
});
