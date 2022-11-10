import React from 'react';
import { render, screen } from '@testing-library/react';
import { StringRestrictions } from './StringRestrictions';
import { StringFormat, StrRestrictionKeys } from '@altinn/schema-model';
import type { RestrictionItemProps } from '../ItemRestrictions';
import userEvent from '@testing-library/user-event';

// Test data
const language = {
  'schema_editor.format': 'Format',
  'schema_editor.format_date': 'Dato',
  'schema_editor.format_date_after_excl': 'Senere enn',
  'schema_editor.format_date_after_incl': 'Tidligst',
  'schema_editor.format_date_before_excl': 'Tidligere enn',
  'schema_editor.format_date_before_incl': 'Senest',
  'schema_editor.format_date_inclusive': 'Inklusiv',
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
  'schema_editor.pattern_test_field': 'Testfelt for regex',
  'schema_editor.regex': 'Regex',
};
const path = '#/properties/testpath';
const onChangeRestrictionValue = jest.fn();
const onChangeRestrictions = jest.fn();
const defaultProps: RestrictionItemProps = {
  language,
  onChangeRestrictionValue,
  onChangeRestrictions,
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

afterEach(() => {
  onChangeRestrictionValue.mockReset();
  onChangeRestrictions.mockReset();
});

test('All default fields should appear by default', () => {
  renderStringRestrictions();
  [
    StrRestrictionKeys.format,
    StrRestrictionKeys.minLength,
    StrRestrictionKeys.maxLength,
    StrRestrictionKeys.pattern,
    'pattern_test_field'
  ].forEach((key) =>
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

test('onChangeRestrictions is called with correct input when format is changed', async () => {
  const { rerender } = renderStringRestrictions();
  await user.click(screen.getByRole('option', { name: language[`schema_editor.format_${StringFormat.Date}`] }));
  expect(onChangeRestrictions).toHaveBeenCalledTimes(1);
  expect(onChangeRestrictions).toHaveBeenCalledWith(
    path,
    expect.objectContaining({ [StrRestrictionKeys.format]: StringFormat.Date })
  );
  onChangeRestrictions.mockReset();
  rerender(<StringRestrictions {...defaultProps} />);
  await user.click(screen.getByRole('option', { name: language[`schema_editor.format_none`] }));
  expect(onChangeRestrictions).toHaveBeenCalledTimes(1);
  expect(onChangeRestrictions).toHaveBeenCalledWith(
    path,
    expect.objectContaining({ [StrRestrictionKeys.format]: '' })
  );
});

test('Date restriction fields appear if and only if format is either date, date-time or time', () => {
  [StringFormat.Date, StringFormat.DateTime, StringFormat.Time].forEach((format: string) => {
    const { unmount } = renderStringRestrictions({ restrictions: { format } });
    expect(screen.getByLabelText(language['schema_editor.format_date_after_incl'])).toBeTruthy();
    expect(screen.getByLabelText(language['schema_editor.format_date_before_incl'])).toBeTruthy();
    expect(screen.getAllByLabelText(language['schema_editor.format_date_inclusive'])).toHaveLength(2);
    unmount();
  });
  [
    '',
    StringFormat.Duration,
    StringFormat.Email,
    StringFormat.IdnEmail,
    StringFormat.Hostname,
    StringFormat.IdnHostname,
    StringFormat.Ipv4,
    StringFormat.Ipv6,
    StringFormat.Uuid,
    StringFormat.Uri,
    StringFormat.UriReference,
    StringFormat.Iri,
    StringFormat.IriReference,
    StringFormat.UriTemplate,
    StringFormat.JsonPointer,
    StringFormat.RelativeJsonPointer,
    StringFormat.Regex
  ].forEach((format: string) => {
    const { unmount } = renderStringRestrictions({ restrictions: { format } });
    expect(screen.queryByLabelText(language['schema_editor.format_date_after_incl'])).toBeFalsy();
    expect(screen.queryByLabelText(language['schema_editor.format_date_before_incl'])).toBeFalsy();
    expect(screen.queryByLabelText(language['schema_editor.format_date_inclusive'])).toBeFalsy();
    unmount();
  });
});

test('"Earliest" field has given value and checkbox is checked when inclusive', () => {
  const format = StringFormat.Date;
  const formatMinimum = '1000-01-01';
  renderStringRestrictions({ restrictions: { format, formatMinimum } });
  expect(screen.getByLabelText(language['schema_editor.format_date_after_incl'])).toHaveValue(formatMinimum);
  expect(screen.queryByLabelText(language['schema_editor.format_date_after_excl'])).toBeFalsy();
  expect(getMinimumInclusiveCheckbox()).toBeChecked();
});

test('"Earliest" field has given value and checkbox is unchecked when exclusive', () => {
  const format = StringFormat.Date;
  const formatExclusiveMinimum = '1000-01-01';
  renderStringRestrictions({ restrictions: { format, formatExclusiveMinimum } });
  expect(screen.getByLabelText(language['schema_editor.format_date_after_excl'])).toHaveValue(formatExclusiveMinimum);
  expect(screen.queryByLabelText(language['schema_editor.format_date_after_incl'])).toBeFalsy();
  expect(getMinimumInclusiveCheckbox()).not.toBeChecked();
});

test('"Latest" field has given value and checkbox is checked when inclusive', () => {
  const format = StringFormat.Date;
  const formatMaximum = '3000-01-01';
  renderStringRestrictions({ restrictions: { format, formatMaximum } });
  expect(screen.getByLabelText(language['schema_editor.format_date_before_incl'])).toHaveValue(formatMaximum);
  expect(screen.queryByLabelText(language['schema_editor.format_date_before_excl'])).toBeFalsy();
  expect(getMaximumInclusiveCheckbox()).toBeChecked();
});

test('"Latest" field has given value and checkbox is unchecked when exclusive', () => {
  const format = StringFormat.Date;
  const formatExclusiveMaximum = '3000-01-01';
  renderStringRestrictions({ restrictions: { format, formatExclusiveMaximum } });
  expect(screen.getByLabelText(language['schema_editor.format_date_before_excl'])).toHaveValue(formatExclusiveMaximum);
  expect(screen.queryByLabelText(language['schema_editor.format_date_before_incl'])).toBeFalsy();
  expect(getMaximumInclusiveCheckbox()).not.toBeChecked();
});

test('onChangeRestrictions is called with correct arguments when "earliest" field is changed', async () => {
  renderStringRestrictions({ restrictions: {format: StringFormat.Date } });
  const input = '2';
  await user.type(screen.getByLabelText(language['schema_editor.format_date_after_incl']), input);
  expect(onChangeRestrictions).toHaveBeenCalledTimes(1);
  expect(onChangeRestrictions).toHaveBeenCalledWith(
    path,
    expect.objectContaining({ [StrRestrictionKeys.formatMinimum]: input })
  );
});

test('onChangeRestrictions is called with correct arguments when "latest" field is changed', async () => {
  renderStringRestrictions({ restrictions: {format: StringFormat.Date } });
  const input = '2';
  await user.type(screen.getByLabelText(language['schema_editor.format_date_before_incl']), input);
  expect(onChangeRestrictions).toHaveBeenCalledTimes(1);
  expect(onChangeRestrictions).toHaveBeenCalledWith(
    path,
    expect.objectContaining({ [StrRestrictionKeys.formatMaximum]: input })
  );
});

test('onChangeRestrictions is called with correct arguments when the "inclusive" checkbox for the "earliest" field is unchecked', async () => {
  const format = StringFormat.Date;
  const formatMinimum = '1000-01-01';
  renderStringRestrictions({ restrictions: { format, formatMinimum } });
  await user.click(getMinimumInclusiveCheckbox());
  expect(onChangeRestrictions).toHaveBeenCalledTimes(1);
  expect(onChangeRestrictions).toHaveBeenCalledWith(
    path,
    expect.objectContaining({
      formatMinimum: undefined,
      formatExclusiveMinimum: formatMinimum
    })
  );
});

test('onChangeRestrictions is called with correct arguments when the "inclusive" checkbox for the "latest" field is unchecked', async () => {
  const format = StringFormat.Date;
  const formatMaximum = '3000-01-01';
  renderStringRestrictions({ restrictions: { format, formatMaximum } });
  await user.click(getMaximumInclusiveCheckbox());
  expect(onChangeRestrictions).toHaveBeenCalledTimes(1);
  expect(onChangeRestrictions).toHaveBeenCalledWith(
    path,
    expect.objectContaining({
      formatMaximum: undefined,
      formatExclusiveMaximum: formatMaximum
    })
  );
});

test('onChangeRestrictions is called with correct arguments when the "inclusive" checkbox for the "earliest" field is checked', async () => {
  const format = StringFormat.Date;
  const formatExclusiveMinimum = '1000-01-01';
  renderStringRestrictions({ restrictions: { format, formatExclusiveMinimum } });
  await user.click(getMinimumInclusiveCheckbox());
  expect(onChangeRestrictions).toHaveBeenCalledTimes(1);
  expect(onChangeRestrictions).toHaveBeenCalledWith(
    path,
    expect.objectContaining({
      formatMinimum: formatExclusiveMinimum,
      formatExclusiveMinimum: undefined
    })
  );
});

test('onChangeRestrictions is called with correct arguments when the "inclusive" checkbox for the "latest" field is checked', async () => {
  const format = StringFormat.Date;
  const formatExclusiveMaximum = '3000-01-01';
  renderStringRestrictions({ restrictions: { format, formatExclusiveMaximum } });
  await user.click(getMaximumInclusiveCheckbox());
  expect(onChangeRestrictions).toHaveBeenCalledTimes(1);
  expect(onChangeRestrictions).toHaveBeenCalledWith(
    path,
    expect.objectContaining({
      formatMaximum: formatExclusiveMaximum,
      formatExclusiveMaximum: undefined
    })
  );
});

test('Minimum length field has given value', async () => {
  const minLength = 3;
  renderStringRestrictions({ restrictions: { minLength } });
  expect(screen.getByLabelText(language[`schema_editor.minLength`])).toHaveValue(minLength.toString());
});

test('onChangeRestrictions is called with correct input when minimum length is changed', async () => {
  renderStringRestrictions({ restrictions: { minLength: '1' } });
  await user.type(screen.getByLabelText(language[`schema_editor.minLength`]), '2');
  expect(onChangeRestrictions).toHaveBeenCalledTimes(1);
  expect(onChangeRestrictions).toHaveBeenCalledWith(
    path,
    expect.objectContaining({ [StrRestrictionKeys.minLength]: '12' })
  );
});

test('Maximum length field has given value', async () => {
  const maxLength = 255;
  renderStringRestrictions({ restrictions: { maxLength } });
  expect(screen.getByLabelText(language[`schema_editor.maxLength`])).toHaveValue(maxLength.toString());
});

test('onChangeRestrictions is called with correct input when maximum length is changed', async () => {
  renderStringRestrictions({ restrictions: { maxLength: '14' } });
  await user.type(screen.getByLabelText(language[`schema_editor.maxLength`]), '4');
  expect(onChangeRestrictions).toHaveBeenCalledTimes(1);
  expect(onChangeRestrictions).toHaveBeenCalledWith(
    path,
    expect.objectContaining({ [StrRestrictionKeys.maxLength]: '144' })
  );
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

const getInclusiveCheckboxes = () => screen.getAllByLabelText(language['schema_editor.format_date_inclusive']);
const getMinimumInclusiveCheckbox = () => getInclusiveCheckboxes()[0];
const getMaximumInclusiveCheckbox = () => getInclusiveCheckboxes()[1];
