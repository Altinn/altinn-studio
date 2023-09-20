import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { NumberRestrictions } from './NumberRestrictions';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { IntRestrictionKey } from '@altinn/schema-model';

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
    await act(() => user.click(checkbox));
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
    const textBoxMinimum = screen.getByRole('textbox', {
      name: textMock('schema_editor.minimum_inclusive'),
    });
    await act(() => user.type(textBoxMinimum, '1'));
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
    const textBoxMinimum = screen.getByRole('textbox', {
      name: textMock('schema_editor.minimum_inclusive'),
    });
    await act(() => user.type(textBoxMinimum, '0'));
    const expectedRestrictions = {
      [IntRestrictionKey.minimum]: 0,
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
