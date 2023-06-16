import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { StringRestrictions } from './StringRestrictions';
import { StringFormat, StrRestrictionKey } from '@altinn/schema-model';
import type { RestrictionItemProps } from '../ItemRestrictions';
import userEvent from '@testing-library/user-event';
import { mockUseTranslation } from '../../../../../../testing/mocks/i18nMock';

// Test data
const texts = {
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
  onChangeRestrictionValue,
  onChangeRestrictions,
  path,
  readonly: false,
  restrictions: {},
};

// Mocks:
jest.mock(
  'react-i18next',
  () => ({ useTranslation: () => mockUseTranslation(texts) }),
);

const user = userEvent.setup();

const renderStringRestrictions = (props?: Partial<RestrictionItemProps>) =>
  render(<StringRestrictions {...defaultProps} {...props} />);

describe('StringRestrictions', () => {
  afterEach(jest.clearAllMocks);

  test.each([
    [StrRestrictionKey.format, 'button'],
    [StrRestrictionKey.minLength, 'textbox'],
    [StrRestrictionKey.maxLength, 'textbox'],
    [StrRestrictionKey.pattern, 'textbox'],
    ['pattern_test_field', 'textbox'],
  ])('%s %s should appear by default', async (key, role) => {
    renderStringRestrictions();
    const field = await screen.findByRole(role, { name: texts[`schema_editor.${key}`] });
    expect(field).toBeInTheDocument();
  });

  test('Format selection appears with all options', async () => {
    renderStringRestrictions();
    expect(screen.getByText(texts[`schema_editor.format`])).toBeDefined();
    const select = screen.getByRole('combobox', { name: texts[`schema_editor.format`] });
    expect(select).toBeInTheDocument();
    await act(() => user.click(select));
    Object.values(StringFormat).forEach((format) => {
      expect(
        screen.getByRole('option', { name: texts[`schema_editor.format_${format}`] })
      ).toHaveAttribute('value', format);
    });
    expect(
      screen.getByRole('option', { name: texts['schema_editor.format_none'] })
    ).toHaveAttribute('value', '');
  });

  test('Empty format option is selected by default', async () => {
    renderStringRestrictions();
    const select = screen.getByRole('combobox', { name: texts[`schema_editor.format`] });
    await act(() => user.click(select));
    expect(
      screen.getByRole('option', { name: texts['schema_editor.format_none'] })
    ).toHaveAttribute('aria-selected', 'true');
  });

  test('Given format option is selected', async () => {
    const format = StringFormat.Date;
    renderStringRestrictions({ restrictions: { format } });
    expect(await getFormatSelect()).toHaveValue(texts[`schema_editor.format_${format}`]);
  });

  test('onChangeRestrictions is called with correct input when format is changed', async () => {
    const { rerender } = renderStringRestrictions();
    const formatSelect = await getFormatSelect();
    await act(() => user.click(formatSelect));
    await act(() => user.click(
      screen.getByRole('option', { name: texts[`schema_editor.format_${StringFormat.Date}`] })
    ));
    expect(onChangeRestrictions).toHaveBeenCalledTimes(1);
    expect(onChangeRestrictions).toHaveBeenCalledWith(
      path,
      expect.objectContaining({ [StrRestrictionKey.format]: StringFormat.Date })
    );
    onChangeRestrictions.mockReset();
    rerender(<StringRestrictions {...defaultProps} />);
    await act(() => user.click(formatSelect));
    await act(() => user.click(screen.getByRole('option', { name: texts[`schema_editor.format_none`] })));
    expect(onChangeRestrictions).toHaveBeenCalledTimes(1);
    expect(onChangeRestrictions).toHaveBeenCalledWith(
      path,
      expect.objectContaining({ [StrRestrictionKey.format]: '' })
    );
  });

  test('Date restriction fields appear if and only if format is either date, date-time or time', () => {
    [StringFormat.Date, StringFormat.DateTime, StringFormat.Time].forEach((format: string) => {
      const { unmount } = renderStringRestrictions({ restrictions: { format } });
      expect(screen.getByLabelText(texts['schema_editor.format_date_after_incl'])).toBeTruthy();
      expect(screen.getByLabelText(texts['schema_editor.format_date_before_incl'])).toBeTruthy();
      expect(screen.getAllByLabelText(texts['schema_editor.format_date_inclusive'])).toHaveLength(
        2
      );
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
      StringFormat.Regex,
    ].forEach((format: string) => {
      const { unmount } = renderStringRestrictions({ restrictions: { format } });
      expect(screen.queryByLabelText(texts['schema_editor.format_date_after_incl'])).toBeFalsy();
      expect(screen.queryByLabelText(texts['schema_editor.format_date_before_incl'])).toBeFalsy();
      expect(screen.queryByLabelText(texts['schema_editor.format_date_inclusive'])).toBeFalsy();
      unmount();
    });
  });

  test('"Earliest" field has given value and checkbox is checked when inclusive', async () => {
    const format = StringFormat.Date;
    const formatMinimum = '1000-01-01';
    renderStringRestrictions({ restrictions: { format, formatMinimum } });
    const inclField = await screen.findByLabelText(texts['schema_editor.format_date_after_incl']);
    expect(inclField).toHaveValue(formatMinimum);
    expect(screen.queryByLabelText(texts['schema_editor.format_date_after_excl'])).toBeFalsy();
    expect(getMinimumInclusiveCheckbox()).toBeChecked();
  });

  test('"Earliest" field has given value and checkbox is unchecked when exclusive', async () => {
    const format = StringFormat.Date;
    const formatExclusiveMinimum = '1000-01-01';
    renderStringRestrictions({ restrictions: { format, formatExclusiveMinimum } });
    const exclField = await screen.findByLabelText(texts['schema_editor.format_date_after_excl']);
    expect(exclField).toHaveValue(formatExclusiveMinimum);
    expect(screen.queryByLabelText(texts['schema_editor.format_date_after_incl'])).toBeFalsy();
    expect(getMinimumInclusiveCheckbox()).not.toBeChecked();
  });

  test('"Latest" field has given value and checkbox is checked when inclusive', async () => {
    const format = StringFormat.Date;
    const formatMaximum = '3000-01-01';
    renderStringRestrictions({ restrictions: { format, formatMaximum } });
    const inclField = await screen.findByLabelText(texts['schema_editor.format_date_before_incl']);
    expect(inclField).toHaveValue(formatMaximum);
    expect(screen.queryByLabelText(texts['schema_editor.format_date_before_excl'])).toBeFalsy();
    expect(getMaximumInclusiveCheckbox()).toBeChecked();
  });

  test('"Latest" field has given value and checkbox is unchecked when exclusive', async () => {
    const format = StringFormat.Date;
    const formatExclusiveMaximum = '3000-01-01';
    renderStringRestrictions({ restrictions: { format, formatExclusiveMaximum } });
    const exclField = await screen.findByLabelText(texts['schema_editor.format_date_before_excl']);
    expect(exclField).toHaveValue(formatExclusiveMaximum);
    expect(screen.queryByLabelText(texts['schema_editor.format_date_before_incl'])).toBeFalsy();
    expect(getMaximumInclusiveCheckbox()).not.toBeChecked();
  });

  test('onChangeRestrictions is called with correct arguments when "earliest" field is changed', async () => {
    renderStringRestrictions({ restrictions: { format: StringFormat.Date } });
    const input = '2';
    await act(() => user.type(screen.getByLabelText(texts['schema_editor.format_date_after_incl']), input));
    expect(onChangeRestrictions).toHaveBeenCalledTimes(1);
    expect(onChangeRestrictions).toHaveBeenCalledWith(
      path,
      expect.objectContaining({ [StrRestrictionKey.formatMinimum]: input })
    );
  });

  test('onChangeRestrictions is called with correct arguments when "latest" field is changed', async () => {
    renderStringRestrictions({ restrictions: { format: StringFormat.Date } });
    const input = '2';
    await act(() => user.type(screen.getByLabelText(texts['schema_editor.format_date_before_incl']), input));
    expect(onChangeRestrictions).toHaveBeenCalledTimes(1);
    expect(onChangeRestrictions).toHaveBeenCalledWith(
      path,
      expect.objectContaining({ [StrRestrictionKey.formatMaximum]: input })
    );
  });

  test('onChangeRestrictions is called with correct arguments when the "inclusive" checkbox for the "earliest" field is unchecked', async () => {
    const format = StringFormat.Date;
    const formatMinimum = '1000-01-01';
    renderStringRestrictions({ restrictions: { format, formatMinimum } });
    await act(() => user.click(getMinimumInclusiveCheckbox()));
    expect(onChangeRestrictions).toHaveBeenCalledTimes(1);
    expect(onChangeRestrictions).toHaveBeenCalledWith(
      path,
      expect.objectContaining({
        formatMinimum: undefined,
        formatExclusiveMinimum: formatMinimum,
      })
    );
  });

  test('onChangeRestrictions is called with correct arguments when the "inclusive" checkbox for the "latest" field is unchecked', async () => {
    const format = StringFormat.Date;
    const formatMaximum = '3000-01-01';
    renderStringRestrictions({ restrictions: { format, formatMaximum } });
    await act(() => user.click(getMaximumInclusiveCheckbox()));
    expect(onChangeRestrictions).toHaveBeenCalledTimes(1);
    expect(onChangeRestrictions).toHaveBeenCalledWith(
      path,
      expect.objectContaining({
        formatMaximum: undefined,
        formatExclusiveMaximum: formatMaximum,
      })
    );
  });

  test('onChangeRestrictions is called with correct arguments when the "inclusive" checkbox for the "earliest" field is checked', async () => {
    const format = StringFormat.Date;
    const formatExclusiveMinimum = '1000-01-01';
    renderStringRestrictions({ restrictions: { format, formatExclusiveMinimum } });
    await act(() => user.click(getMinimumInclusiveCheckbox()));
    expect(onChangeRestrictions).toHaveBeenCalledTimes(1);
    expect(onChangeRestrictions).toHaveBeenCalledWith(
      path,
      expect.objectContaining({
        formatMinimum: formatExclusiveMinimum,
        formatExclusiveMinimum: undefined,
      })
    );
  });

  test('onChangeRestrictions is called with correct arguments when the "inclusive" checkbox for the "latest" field is checked', async () => {
    const format = StringFormat.Date;
    const formatExclusiveMaximum = '3000-01-01';
    renderStringRestrictions({ restrictions: { format, formatExclusiveMaximum } });
    await act(() => user.click(getMaximumInclusiveCheckbox()));
    expect(onChangeRestrictions).toHaveBeenCalledTimes(1);
    expect(onChangeRestrictions).toHaveBeenCalledWith(
      path,
      expect.objectContaining({
        formatMaximum: formatExclusiveMaximum,
        formatExclusiveMaximum: undefined,
      })
    );
  });

  test('Minimum length field has given value', async () => {
    const minLength = 3;
    renderStringRestrictions({ restrictions: { minLength } });
    const minLengthField = await screen.findByLabelText(texts[`schema_editor.minLength`]);
    expect(minLengthField).toHaveValue(minLength.toString());
  });

  test('onChangeRestrictions is called with correct input when minimum length is changed', async () => {
    renderStringRestrictions({ restrictions: { minLength: '1' } });
    await act(() => user.type(screen.getByLabelText(texts[`schema_editor.minLength`]), '2'));
    expect(onChangeRestrictions).toHaveBeenCalledTimes(1);
    expect(onChangeRestrictions).toHaveBeenCalledWith(
      path,
      expect.objectContaining({ [StrRestrictionKey.minLength]: '12' })
    );
  });

  test('Maximum length field has given value', async () => {
    const maxLength = 255;
    renderStringRestrictions({ restrictions: { maxLength } });
    const maxLengthField = await screen.findByLabelText(texts[`schema_editor.maxLength`]);
    expect(maxLengthField).toHaveValue(maxLength.toString());
  });

  test('onChangeRestrictions is called with correct input when maximum length is changed', async () => {
    renderStringRestrictions({ restrictions: { maxLength: '14' } });
    await act(() => user.type(screen.getByLabelText(texts[`schema_editor.maxLength`]), '4'));
    expect(onChangeRestrictions).toHaveBeenCalledTimes(1);
    expect(onChangeRestrictions).toHaveBeenCalledWith(
      path,
      expect.objectContaining({ [StrRestrictionKey.maxLength]: '144' })
    );
  });

  test('Pattern field has given value', async () => {
    const pattern = '[A-Z]';
    renderStringRestrictions({ restrictions: { pattern } });
    const patternField = await screen.findByLabelText(texts[`schema_editor.pattern`]);
    expect(patternField).toHaveValue(pattern);
  });

  test('onChangeRestrictionValue is called with correct input when pattern is changed', async () => {
    renderStringRestrictions({ restrictions: { pattern: '[a-z' } });
    await act(() => user.type(screen.getByLabelText(texts[`schema_editor.pattern`]), ']'));
    expect(onChangeRestrictionValue).toHaveBeenCalledTimes(1);
    expect(onChangeRestrictionValue).toHaveBeenCalledWith(path, StrRestrictionKey.pattern, '[a-z]');
  });
});

const getFormatSelect = () => screen.findByRole('combobox', { name: texts['schema_editor.format'] });
const getInclusiveCheckboxes = () =>
  screen.getAllByLabelText(texts['schema_editor.format_date_inclusive']);
const getMinimumInclusiveCheckbox = () => getInclusiveCheckboxes()[0];
const getMaximumInclusiveCheckbox = () => getInclusiveCheckboxes()[1];
