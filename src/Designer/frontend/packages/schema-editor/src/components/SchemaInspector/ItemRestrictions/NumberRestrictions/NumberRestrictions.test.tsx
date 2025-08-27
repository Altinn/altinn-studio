import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { NumberRestrictions } from './NumberRestrictions';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { IntRestrictionKey } from '@altinn/schema-model/index';

describe('NumberRestrictions component', () => {
  it('Should render checkbox for minimum', () => {
    const props = {
      restrictions: {},
      path: '',
      onChangeRestrictions: jest.fn(),
      onChangeRestrictionValue: jest.fn(),
      isInteger: false,
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
      isInteger: false,
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
      isInteger: false,
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
      isInteger: false,
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
      isInteger: false,
    };
    render(<NumberRestrictions readonly={false} {...props} />);
    const textfield = screen.getByLabelText(textMock('schema_editor.multipleOf'));
    expect(textfield).toBeInTheDocument();
  });

  it('Should call onChangeRestrictions when checkbox is clicked', async () => {
    const user = userEvent.setup();
    const onChangeRestrictions = jest.fn();
    const props = {
      restrictions: {},
      path: '',
      onChangeRestrictions,
      onChangeRestrictionValue: jest.fn(),
      isInteger: false,
    };
    render(<NumberRestrictions readonly={false} {...props} />);
    const checkbox = screen.getAllByLabelText(textMock('schema_editor.format_date_inclusive'))[0];
    await user.click(checkbox);
    expect(onChangeRestrictions).toHaveBeenCalled();
  });

  it('Should call onChangeRestrictions with correct values when value is changed', async () => {
    const user = userEvent.setup();
    const onChangeRestrictions = jest.fn();
    const props = {
      restrictions: {},
      path: '',
      onChangeRestrictions,
      onChangeRestrictionValue: jest.fn(),
      isInteger: false,
    };
    render(<NumberRestrictions readonly={false} {...props} />);
    const textBoxMinimum = screen.getByRole('spinbutton', {
      name: textMock('schema_editor.minimum_inclusive'),
    });
    await user.type(textBoxMinimum, '1');
    const expectedRestrictions = {
      [IntRestrictionKey.minimum]: 1,
      [IntRestrictionKey.exclusiveMinimum]: undefined,
      [IntRestrictionKey.maximum]: undefined,
      [IntRestrictionKey.exclusiveMaximum]: undefined,
      [IntRestrictionKey.multipleOf]: undefined,
      [IntRestrictionKey.integer]: undefined,
    };

    await waitFor(() =>
      expect(onChangeRestrictions).toHaveBeenCalledWith('', expectedRestrictions),
    );
  });

  it('Should call onChangeRestrictions with correct values when value is changed to 0', async () => {
    const user = userEvent.setup();
    const onChangeRestrictions = jest.fn();
    const props = {
      restrictions: {},
      path: '',
      onChangeRestrictions,
      onChangeRestrictionValue: jest.fn(),
      isInteger: false,
    };
    render(<NumberRestrictions readonly={false} {...props} />);
    const textBoxMaximum = screen.getByRole('spinbutton', {
      name: textMock('schema_editor.maximum_inclusive'),
    });
    await user.type(textBoxMaximum, '0');
    const expectedRestrictions = {
      [IntRestrictionKey.minimum]: undefined,
      [IntRestrictionKey.exclusiveMinimum]: undefined,
      [IntRestrictionKey.maximum]: 0,
      [IntRestrictionKey.exclusiveMaximum]: undefined,
      [IntRestrictionKey.multipleOf]: undefined,
      [IntRestrictionKey.integer]: undefined,
    };

    await waitFor(() =>
      expect(onChangeRestrictions).toHaveBeenCalledWith('', expectedRestrictions),
    );
  });

  it('Should call onChangeRestrictions with correct values when value is cleared', async () => {
    const user = userEvent.setup();
    const onChangeRestrictions = jest.fn();
    const props = {
      restrictions: {},
      path: '',
      onChangeRestrictions,
      onChangeRestrictionValue: jest.fn(),
      isInteger: false,
    };
    render(<NumberRestrictions readonly={false} {...props} />);
    const textBoxMinimum = screen.getByRole('spinbutton', {
      name: textMock('schema_editor.minimum_inclusive'),
    });
    await user.type(textBoxMinimum, '0');
    await user.clear(textBoxMinimum);
    const textBoxMaximum = screen.getByRole('spinbutton', {
      name: textMock('schema_editor.maximum_inclusive'),
    });
    await user.type(textBoxMaximum, '0');
    await user.clear(textBoxMaximum);
    const expectedRestrictions = {
      [IntRestrictionKey.minimum]: undefined,
      [IntRestrictionKey.exclusiveMinimum]: undefined,
      [IntRestrictionKey.maximum]: undefined,
      [IntRestrictionKey.exclusiveMaximum]: undefined,
      [IntRestrictionKey.multipleOf]: undefined,
      [IntRestrictionKey.integer]: undefined,
    };

    await waitFor(() =>
      expect(onChangeRestrictions).toHaveBeenCalledWith('', expectedRestrictions),
    );
  });
});
