import React from 'react';
import { render, screen } from '@testing-library/react';
import { StringRestrictions } from './StringRestrictions';
import { StrRestrictionKeys } from '@altinn/schema-model';
import { RestrictionItemProps } from '../ItemRestrictions';
import { StringFormat } from '@altinn/schema-model/src/lib/types';
import userEvent from '@testing-library/user-event';

// Test data
const texts = {
  format: 'Format',
  format_date: 'Dato',
  'format_date-time': 'Dato og klokkeslett',
  format_duration: 'Varighet',
  format_email: 'E-postadresse',
  format_hostname: 'Internettvertsnavn',
  'format_idn-email': 'E-postadresse med internasjonalt tegnsett',
  'format_idn-hostname': 'Internettvertsnavn med internasjonalt tegnsett',
  format_ipv4: 'IP-adresse versjon 4',
  format_ipv6: 'IP-adresse versjon 6',
  format_iri: 'URI med internasjonalt tegnsett',
  'format_iri-reference': 'URI eller relativ referanse med internasjonalt tegnsett',
  'format_json-pointer': 'JSON-peker',
  format_none: 'Intet format',
  format_regex: 'Regex',
  'format_relative-json-pointer': 'Relativ JSON-peker',
  format_time: 'Klokkeslett',
  format_uri: 'URI',
  'format_uri-reference': 'URI eller relativ referanse',
  'format_uri-template': 'URI-mal',
  format_uuid: 'UUID',
  maxLength: 'Maksimal lengde',
  minLength: 'Minimal lengde',
  pattern: 'Mønster',
  regex: 'Regex',
};
const path = '#/properties/testpath';
const onChangeRestrictionValue = jest.fn();
const defaultProps: RestrictionItemProps = {
  language: { schema_editor: texts },
  onChangeRestrictionValue,
  path,
  readonly: false,
  restrictions: {}
};

const user = userEvent.setup();

const renderStringRestrictions = (props?: Partial<RestrictionItemProps>) =>
  render(<StringRestrictions {...defaultProps} {...props} />);

afterEach(() => onChangeRestrictionValue.mockReset());

test('StringRestrictions should render correctly', () => {
  renderStringRestrictions();
  Object.values(StrRestrictionKeys).forEach((key) => expect(screen.getByLabelText(texts[key])).toBeDefined());
});

test('Format selection appears with all options', () => {
  renderStringRestrictions();
  expect(screen.getByText(texts.format)).toBeDefined();
  expect(screen.getByLabelText(texts.format)).toBeDefined();
  Object.values(StringFormat).forEach((format) => {
    expect(screen.getByRole('option', { name: texts[`format_${format}`] })).toHaveValue(format);
  });
  expect(screen.getByRole('option', { name: texts['format_none'] })).toHaveValue('');
});

test('Empty format option is selected by default', () => {
  renderStringRestrictions();
  expect(screen.getByLabelText(texts.format)).toHaveValue('');
});

test('Given format option is selected', () => {
  const format = StringFormat.Date;
  renderStringRestrictions({ restrictions: { format } });
  expect(screen.getByLabelText(texts.format)).toHaveValue(format);
});

test('onChangeRestrictionValue is called with correct input when format is changed', async () => {
  const { rerender } = renderStringRestrictions();
  await user.selectOptions(screen.getByLabelText(texts.format), StringFormat.Date);
  expect(onChangeRestrictionValue).toHaveBeenCalledTimes(1);
  expect(onChangeRestrictionValue).toHaveBeenCalledWith(path, StrRestrictionKeys.format, StringFormat.Date);
  onChangeRestrictionValue.mockReset();
  rerender(<StringRestrictions {...defaultProps} />);
  await user.selectOptions(screen.getByLabelText(texts.format), '');
  expect(onChangeRestrictionValue).toHaveBeenCalledTimes(1);
  expect(onChangeRestrictionValue).toHaveBeenCalledWith(path, StrRestrictionKeys.format, undefined);
});

test('Minimum length field has given value', async () => {
  const minLength = 3;
  renderStringRestrictions({ restrictions: { minLength } });
  expect(screen.getByLabelText(texts.minLength)).toHaveValue(minLength.toString());
});

test('onChangeRestrictionValue is called with correct input when minimum length is changed', async () => {
  renderStringRestrictions({ restrictions: { minLength: '1' } });
  await user.type(screen.getByLabelText(texts.minLength), '2');
  expect(onChangeRestrictionValue).toHaveBeenCalledTimes(1);
  expect(onChangeRestrictionValue).toHaveBeenCalledWith(path, StrRestrictionKeys.minLength, '12');
});

test('Maximum length field has given value', async () => {
  const maxLength = 255;
  renderStringRestrictions({ restrictions: { maxLength } });
  expect(screen.getByLabelText(texts.maxLength)).toHaveValue(maxLength.toString());
});

test('onChangeRestrictionValue is called with correct input when maximum length is changed', async () => {
  renderStringRestrictions({ restrictions: { maxLength: '14' } });
  await user.type(screen.getByLabelText(texts.maxLength), '4');
  expect(onChangeRestrictionValue).toHaveBeenCalledTimes(1);
  expect(onChangeRestrictionValue).toHaveBeenCalledWith(path, StrRestrictionKeys.maxLength, '144');
});

test('Pattern field has given value', async () => {
  const pattern = "[A-Z]";
  renderStringRestrictions({ restrictions: { pattern } });
  expect(screen.getByLabelText(texts.pattern)).toHaveValue(pattern);
});

test('onChangeRestrictionValue is called with correct input when pattern is changed', async () => {
  renderStringRestrictions({ restrictions: { pattern: '[a-z' } });
  await user.type(screen.getByLabelText(texts.pattern), ']');
  expect(onChangeRestrictionValue).toHaveBeenCalledTimes(1);
  expect(onChangeRestrictionValue).toHaveBeenCalledWith(path, StrRestrictionKeys.pattern, '[a-z]');
});
