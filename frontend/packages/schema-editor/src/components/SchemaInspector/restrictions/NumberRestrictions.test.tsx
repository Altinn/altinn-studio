import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { NumberRestrictions } from './NumberRestrictions';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

describe('NumberRestrictions component', () => {
  it('Should render checkbox for minimum', () => {
    const props = {
      restrictions: {},
      path: '',
      onChangeRestrictions: jest.fn(),
      onChangeRestrictionValue: jest.fn(),
    };
    render(<NumberRestrictions readonly={false} {...props} />);
    const checkbox = screen.getByLabelText(textMock('schema_editor.minimum_inclusive'));
    expect(checkbox).toBeInTheDocument();
  });

  it('Should render checkbox for maximum,', () => {
    const props = {
      restrictions: {},
      path: '',
      onChangeRestrictions: jest.fn(),
      onChangeRestrictionValue: jest.fn(),
    };
    render(<NumberRestrictions readonly={false} {...props} />);
    const checkbox = screen.getByLabelText(textMock('schema_editor.maximum_inclusive'));
    expect(checkbox).toBeInTheDocument();
  });

  it('Should render textfield for minimum value ', () => {
    const props = {
      restrictions: {},
      path: '',
      onChangeRestrictions: jest.fn(),
      onChangeRestrictionValue: jest.fn(),
    };
    render(<NumberRestrictions readonly={false} {...props} />);
    const textfield = screen.getByLabelText(textMock('schema_editor.minimum_inclusive'));
    expect(textfield).toBeInTheDocument();
  });

  it('Should render textfield for maximum value', () => {
    const props = {
      restrictions: {},
      path: '',
      onChangeRestrictions: jest.fn(),
      onChangeRestrictionValue: jest.fn(),
    };
    render(<NumberRestrictions readonly={false} {...props} />);
    const textfield = screen.getByLabelText(textMock('schema_editor.maximum_inclusive'));
    expect(textfield).toBeInTheDocument();
  });

  it('Should render textfield for multiple numbers', () => {
    const props = {
      restrictions: {},
      path: '',
      onChangeRestrictions: jest.fn(),
      onChangeRestrictionValue: jest.fn(),
    };
    render(<NumberRestrictions readonly={false} {...props} />);
    const textfield = screen.getByLabelText(textMock('schema_editor.multipleOf'));
    expect(textfield).toBeInTheDocument();
  });

  it('Should call onChangeRestrictions when checkbox is clicked', async () => {
    const onChangeRestrictions = jest.fn();
    const props = {
      restrictions: {},
      path: '',
      onChangeRestrictions,
      onChangeRestrictionValue: jest.fn(),
    };
    render(<NumberRestrictions readonly={false} {...props} />);
    const checkbox = screen.getAllByLabelText(textMock('schema_editor.format_date_inclusive'))[0];
    await act(() => user.click(checkbox));
    expect(onChangeRestrictions).toHaveBeenCalled();
  });
});
