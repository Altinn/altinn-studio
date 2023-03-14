import React from 'react';
import { render, screen } from '@testing-library/react';
import { NumberRestrictions } from './NumberRestrictions';
import { fireEvent } from '@testing-library/react';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { NameError } from '@altinn/schema-editor/types';

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {},
});

describe('NumberRestrictions component', () => {
  it('Should render checkbox for minimum', () => {
    const props = {
      restrictions: {},
      path: '',
      onChangeRestrictions: jest.fn(),
      onChangeRestrictionValue: jest.fn(),
    };
    render(<NumberRestrictions readonly={false} {...props} />);
    const checkbox = screen.getByLabelText(/schema_editor.minimum_inclusive/);
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
    const checkbox = screen.getByLabelText(/schema_editor.maximum_inclusive/);
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
    const textfield = screen.getByLabelText(/schema_editor.minimum_/);
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
    const textfield = screen.getByLabelText(/schema_editor.maximum_/);
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
    const textfield = screen.getByLabelText(/schema_editor.multipleOf/);
    expect(textfield).toBeInTheDocument();
  });

  it('Should checkbox be clicked ', () => {
    const props = {
      restrictions: {},
      path: '',
      onChangeRestrictions: jest.fn(),
      onChangeRestrictionValue: jest.fn(),
    };
    render(<NumberRestrictions readonly={false} {...props} />);
    const checkbox = screen.getByLabelText(/schema_editor.minimum_inclusive/);
    fireEvent.click(checkbox);
    expect(checkbox).toBeCalled;
  });

  test('should return NoError if min is less than max', () => {
    const props = {
      restrictions: {},
      path: '',
      onChangeRestrictions: jest.fn(),
      onChangeRestrictionValue: jest.fn(),
    };
    render(<NumberRestrictions readonly={false} {...props} />);

    const formatState = { min: 4, max: 7 };

    expect(validateMinMax(formatState)).toBe(NameError.NoError);
  });

  it('should return NoError if min is less than max', () => {
    const formatState = { min: 4, max: 7 };
    expect(validateMinMax(formatState)).toBe(NameError.NoError);
  });

  it('should return error message if min is greater than max', () => {
    const formatState = { min: 7, max: 4 };
    expect(validateMinMax(formatState)).toBe(NameError.InvalidMaxMinValue);
  });

  it('should return error message if min is equal to max', () => {
    const formatState = { min: 2, max: 2 };
    expect(validateMinMax(formatState)).toBe(NameError.InvalidMaxMinValue);
  });
});

function validateMinMax(formatState: { min: number; max: number }): any {
  if (formatState.min !== undefined && formatState.max !== undefined) {
    if (formatState.min >= formatState.max) {
      return NameError.InvalidMaxMinValue;
    }
  }
  return NameError.NoError;
}
