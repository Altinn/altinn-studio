import React from 'react';
import { render, screen } from '@testing-library/react';
import { NumberRestrictions } from './NumberRestrictions';
import { fireEvent } from '@testing-library/react';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

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
    const checkbox = screen.getByLabelText(/schema_editor_minimum_inclusive/);
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
    const checkbox = screen.getByLabelText(/schema_editor_maximum_inclusive/);
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
    const textfield = screen.getByLabelText(/schema_editor_minimum_/);
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
    const textfield = screen.getByLabelText(/schema_editor_maximum_/);
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
    const checkbox = screen.getByLabelText(/schema_editor_minimum_inclusive/);
    fireEvent.click(checkbox);
    expect(checkbox).toBeCalled;
  });
});
