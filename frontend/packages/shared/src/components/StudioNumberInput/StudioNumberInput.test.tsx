import React from 'react';
import { act, render as rtlRender, screen } from '@testing-library/react';
import { StudioNumberInput, StudioNumberInputProps } from './StudioNumberInput';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();
const description = 'description';
const onChange = jest.fn();
describe('StudioNumberInput', () => {
  it('should render description and input field', () => {
    render({ description, onChange });
    expect(screen.getByText('description')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it("should allow decimal numbers with '.'", async () => {
    render({ description, onChange });
    const inputElement = screen.getByRole('textbox');
    await act(() => user.type(inputElement, '123.456'));
    expect(inputElement).toHaveValue('123.456');
  });

  it('should update input value on change', async () => {
    render({ description, onChange });
    const inputElement = screen.getByRole('textbox');
    await act(() => user.type(inputElement, '123'));
    expect(inputElement).toHaveValue('123');
  });

  it('should not allow non-numeric input', async () => {
    render({ description, onChange });
    const inputElement = screen.getByRole('textbox');
    await act(() => user.type(inputElement, 'abc'));
    expect(inputElement).toHaveValue('');
  });

  it('should not allow non-numeric input after numeric input', async () => {
    render({ description, onChange });
    const inputElement = screen.getByRole('textbox');
    await act(() => user.type(inputElement, '123abc'));
    expect(inputElement).toHaveValue('123');
  });
});

const render = (props: Partial<StudioNumberInputProps> = {}) => {
  const allProps: StudioNumberInputProps = {
    description,
    onChange,
    ...props,
  } as StudioNumberInputProps;
  rtlRender(<StudioNumberInput {...allProps} />);
};
