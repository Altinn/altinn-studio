import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { PrefillConfig } from 'app-shared/types/PrefillConfig';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { PrefillSection } from './PrefillSection';

const user = userEvent.setup();

const schemaPointer = '#/properties/orgNumberField';
const dataBindingName = 'orgNumberField';

describe('PrefillSection', () => {
  afterEach(jest.clearAllMocks);

  it('Renders with no source selected when there is no existing prefill mapping', () => {
    render();
    expect(
      screen.getByRole('combobox', { name: textMock('schema_editor.prefill.source') }),
    ).toHaveValue('');
    expect(
      screen.queryByRole('combobox', { name: textMock('schema_editor.prefill.field') }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: textMock('schema_editor.prefill.query_parameter') }),
    ).not.toBeInTheDocument();
  });

  it('Pre-selects the source and field from an existing ER mapping', () => {
    const prefillConfig: PrefillConfig = { ER: { OrgNumber: dataBindingName } };
    render(prefillConfig);
    expect(
      screen.getByRole('combobox', { name: textMock('schema_editor.prefill.source') }),
    ).toHaveValue('ER');
    expect(
      screen.getByRole('combobox', { name: textMock('schema_editor.prefill.field') }),
    ).toHaveValue('OrgNumber');
  });

  it('Pre-fills the query parameter name from an existing QueryParameters mapping', () => {
    const prefillConfig: PrefillConfig = { QueryParameters: { caseId: dataBindingName } };
    render(prefillConfig);
    expect(
      screen.getByRole('textbox', { name: textMock('schema_editor.prefill.query_parameter') }),
    ).toHaveValue('caseId');
  });

  it('Shows a field dropdown with the known ER fields when ER is selected as source', async () => {
    const savePrefillConfig = jest.fn();
    render({}, savePrefillConfig);
    await user.selectOptions(
      screen.getByRole('combobox', { name: textMock('schema_editor.prefill.source') }),
      'ER',
    );
    const fieldSelect = screen.getByRole('combobox', {
      name: textMock('schema_editor.prefill.field'),
    });
    expect(fieldSelect).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'OrgNumber' })).toBeInTheDocument();
  });

  it('Saves the prefill config when a field is selected for a known-field source', async () => {
    const savePrefillConfig = jest.fn();
    render({}, savePrefillConfig);
    await user.selectOptions(
      screen.getByRole('combobox', { name: textMock('schema_editor.prefill.source') }),
      'ER',
    );
    savePrefillConfig.mockClear();
    await user.selectOptions(
      screen.getByRole('combobox', { name: textMock('schema_editor.prefill.field') }),
      'OrgNumber',
    );
    expect(savePrefillConfig).toHaveBeenCalledTimes(1);
    expect(savePrefillConfig).toHaveBeenCalledWith({ ER: { OrgNumber: dataBindingName } });
  });

  it('Shows a text input for query parameter name when QueryParameters is selected as source', async () => {
    const savePrefillConfig = jest.fn();
    render({}, savePrefillConfig);
    await user.selectOptions(
      screen.getByRole('combobox', { name: textMock('schema_editor.prefill.source') }),
      'QueryParameters',
    );
    expect(
      screen.getByRole('textbox', { name: textMock('schema_editor.prefill.query_parameter') }),
    ).toBeInTheDocument();
  });

  it('Saves the prefill config with the typed query parameter name on blur', async () => {
    const savePrefillConfig = jest.fn();
    render({}, savePrefillConfig);
    await user.selectOptions(
      screen.getByRole('combobox', { name: textMock('schema_editor.prefill.source') }),
      'QueryParameters',
    );
    savePrefillConfig.mockClear();
    const queryParamInput = screen.getByRole('textbox', {
      name: textMock('schema_editor.prefill.query_parameter'),
    });
    await user.type(queryParamInput, 'caseId');
    await user.tab();
    expect(savePrefillConfig).toHaveBeenCalledWith({
      QueryParameters: { caseId: dataBindingName },
    });
  });

  it('Removes the existing mapping when the source is changed back to none', async () => {
    const savePrefillConfig = jest.fn();
    const prefillConfig: PrefillConfig = { ER: { OrgNumber: dataBindingName } };
    render(prefillConfig, savePrefillConfig);
    await user.selectOptions(
      screen.getByRole('combobox', { name: textMock('schema_editor.prefill.source') }),
      '',
    );
    expect(savePrefillConfig).toHaveBeenCalledWith({});
  });

  it('Preserves unrelated prefill mappings when saving a new mapping', async () => {
    const savePrefillConfig = jest.fn();
    const prefillConfig: PrefillConfig = { ER: { Name: 'someOtherField' } };
    render(prefillConfig, savePrefillConfig);
    await user.selectOptions(
      screen.getByRole('combobox', { name: textMock('schema_editor.prefill.source') }),
      'DSF',
    );
    savePrefillConfig.mockClear();
    await user.selectOptions(
      screen.getByRole('combobox', { name: textMock('schema_editor.prefill.field') }),
      'SSN',
    );
    expect(savePrefillConfig).toHaveBeenCalledWith({
      ER: { Name: 'someOtherField' },
      DSF: { SSN: dataBindingName },
    });
  });
});

const render = (
  prefillConfig: PrefillConfig = {},
  savePrefillConfig: (config: PrefillConfig) => void = jest.fn(),
) =>
  renderWithProviders({
    appContextProps: { prefillConfig, savePrefillConfig },
  })(<PrefillSection schemaPointer={schemaPointer} />);
