import React from 'react';
import { render, screen } from '@testing-library/react';
import { StringRestrictions } from './StringRestrictions';
import { StrRestrictionKeys } from '@altinn/schema-model';
import type { RestrictionItemProps } from '../ItemRestrictions';
import { StringFormat } from '@altinn/schema-model/src/lib/types';
import userEvent from '@testing-library/user-event';

// Test data
const language = {
  'schema_editor.format': 'Format',
  'schema_editor.format_date': 'Dato',
  'schema_editor.format_date-time': 'Dato og klokkeslett',
  'schema_editor.format_duration': 'Varighet',
  'schema_editor.format_email': 'E-postadresse',
  'schema_editor.format_hostname': 'Internettvertsnavn',
  'schema_editor.format_idn-email': 'E-postadresse med internasjonalt tegnsett',
  'schema_editor.format_idn-hostname': 'Internettvertsnavn med internasjonalt tegnsett',
  'schema_editor.format_ipv4': 'IP-adresse versjon 4',
  'schema_editor.format_ipv6': 'IP-adresse versjon 6',
  'schema_editor.format_iri': 'URI med internasjonalt tegnsett',
  'schema_editor.format_iri-reference': 'URI eller relativ referanse med internasjonalt tegnsett',
  'schema_editor.format_json-pointer': 'JSON-peker',
  'schema_editor.format_none': 'Intet format',
  'schema_editor.format_regex': 'Regex',
  'schema_editor.format_relative-json-pointer': 'Relativ JSON-peker',
  'schema_editor.format_time': 'Klokkeslett',
  'schema_editor.format_uri': 'URI',
  'schema_editor.format_uri-reference': 'URI eller relativ referanse',
  'schema_editor.format_uri-template': 'URI-mal',
  'schema_editor.format_uuid': 'UUID',
  'schema_editor.maxLength': 'Maksimal lengde',
  'schema_editor.minLength': 'Minimal lengde',
  'schema_editor.pattern': 'Mønster',
  'schema_editor.regex': 'Regex',
};
const path = '#/properties/testpath';
const onChangeRestrictionValue = jest.fn();
const defaultProps: RestrictionItemProps = {
  language,
  onChangeRestrictionValue,
  path,
  readonly: false,
  restrictions: {},
};

const user = userEvent.setup();

const renderStringRestrictions = (props?: Partial<RestrictionItemProps>) =>
  render(
    <StringRestrictions
      {...defaultProps}
      {...props}
    />,
  );

afterEach(() => onChangeRestrictionValue.mockReset());

test('StringRestrictions should render correctly', () => {
  renderStringRestrictions();
  Object.values(StrRestrictionKeys).forEach((key) =>
    expect(screen.getByLabelText(language[`schema_editor.${key}`])).toBeDefined(),
  );
});

test('Format selection appears with all options', () => {
  renderStringRestrictions();
  expect(screen.getByText(language[`schema_editor.format`])).toBeDefined();
  expect(screen.getByLabelText(language[`schema_editor.format`])).toBeDefined();
  Object.values(StringFormat).forEach((format) => {
    expect(screen.getByRole('option', { name: language[`schema_editor.format_${format}`] }))
      .toHaveAttribute('value', format);
  });
  expect(screen.getByRole('option', { name: language['schema_editor.format_none'] })).toHaveAttribute('value', '');
});

test('Empty format option is selected by default', () => {
  renderStringRestrictions();
  expect(screen.getByLabelText(language[`schema_editor.format`])).toHaveValue('');
});

test('Given format option is selected', () => {
  const format = StringFormat.Date;
  renderStringRestrictions({ restrictions: { format } });
  expect(screen.getByLabelText(language[`schema_editor.format`])).toHaveValue(format);
});

test('onChangeRestrictionValue is called with correct input when format is changed', async () => {
  const { rerender } = renderStringRestrictions();
  await user.click(screen.getByRole('option', { name: language[`schema_editor.format_${StringFormat.Date}`] }));
  expect(onChangeRestrictionValue).toHaveBeenCalledTimes(1);
  expect(onChangeRestrictionValue).toHaveBeenCalledWith(path, StrRestrictionKeys.format, StringFormat.Date);
  onChangeRestrictionValue.mockReset();
  rerender(<StringRestrictions {...defaultProps} />);
  await user.click(screen.getByRole('option', { name: language[`schema_editor.format_none`] }));
  expect(onChangeRestrictionValue).toHaveBeenCalledTimes(1);
  expect(onChangeRestrictionValue).toHaveBeenCalledWith(path, StrRestrictionKeys.format, undefined);
});

test('Minimum length field has given value', async () => {
  const minLength = 3;
  renderStringRestrictions({ restrictions: { minLength } });
  expect(screen.getByLabelText(language[`schema_editor.minLength`])).toHaveValue(minLength.toString());
});

test('onChangeRestrictionValue is called with correct input when minimum length is changed', async () => {
  renderStringRestrictions({ restrictions: { minLength: '1' } });
  await user.type(screen.getByLabelText(language[`schema_editor.minLength`]), '2');
  expect(onChangeRestrictionValue).toHaveBeenCalledTimes(1);
  expect(onChangeRestrictionValue).toHaveBeenCalledWith(path, StrRestrictionKeys.minLength, '12');
});

test('Maximum length field has given value', async () => {
  const maxLength = 255;
  renderStringRestrictions({ restrictions: { maxLength } });
  expect(screen.getByLabelText(language[`schema_editor.maxLength`])).toHaveValue(maxLength.toString());
});

test('onChangeRestrictionValue is called with correct input when maximum length is changed', async () => {
  renderStringRestrictions({ restrictions: { maxLength: '14' } });
  await user.type(screen.getByLabelText(language[`schema_editor.maxLength`]), '4');
  expect(onChangeRestrictionValue).toHaveBeenCalledTimes(1);
  expect(onChangeRestrictionValue).toHaveBeenCalledWith(path, StrRestrictionKeys.maxLength, '144');
});

test('Pattern field has given value', async () => {
  const pattern = '[A-Z]';
  renderStringRestrictions({ restrictions: { pattern } });
  expect(screen.getByLabelText(language[`schema_editor.pattern`])).toHaveValue(pattern);
});

test('onChangeRestrictionValue is called with correct input when pattern is changed', async () => {
  renderStringRestrictions({ restrictions: { pattern: '[a-z' } });
  await user.type(screen.getByLabelText(language[`schema_editor.pattern`]), ']');
  expect(onChangeRestrictionValue).toHaveBeenCalledTimes(1);
  expect(onChangeRestrictionValue).toHaveBeenCalledWith(path, StrRestrictionKeys.pattern, '[a-z]');
});
