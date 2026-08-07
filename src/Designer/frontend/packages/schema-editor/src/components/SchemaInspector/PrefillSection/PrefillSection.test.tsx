import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { PrefillConfig } from 'app-shared/types/PrefillConfig';
import { PrefillSource } from 'app-shared/types/PrefillConfig';
import type { FieldNode } from '@altinn/schema-model';
import { FieldType, ObjectKind, SchemaModel } from '@altinn/schema-model';
import type { SchemaEditorAppContextProps } from '@altinn/schema-editor/contexts/SchemaEditorAppContext';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import type { PrefillSectionProps } from './PrefillSection';
import { PrefillSection } from './PrefillSection';

const user = userEvent.setup();

const schemaPointer = '#/properties/orgNumberField';
const dataBindingName = 'orgNumberField';
const otherSchemaPointer = '#/properties/otherField';

const fieldNodeMock: FieldNode = {
  objectKind: ObjectKind.Field,
  fieldType: FieldType.String,
  schemaPointer,
  isRequired: false,
  isNillable: false,
  isArray: false,
  children: [],
  custom: {},
  restrictions: {},
  implicitType: true,
};

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
    render({ prefill: { source: PrefillSource.ER, key: 'OrgNumber' } });
    expect(
      screen.getByRole('combobox', { name: textMock('schema_editor.prefill.source') }),
    ).toHaveValue('ER');
    expect(
      screen.getByRole('combobox', { name: textMock('schema_editor.prefill.field') }),
    ).toHaveValue('OrgNumber');
  });

  it('Pre-fills the query parameter name from an existing QueryParameters mapping', () => {
    render({ prefill: { source: PrefillSource.QueryParameters, key: 'caseId' } });
    expect(
      screen.getByRole('textbox', { name: textMock('schema_editor.prefill.query_parameter') }),
    ).toHaveValue('caseId');
  });

  it('Shows a field dropdown with the known ER fields when ER is selected as source', async () => {
    render();
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

  it('Saves the prefill config and updates the internal model when a field is selected for a known-field source', async () => {
    const savePrefillConfig = jest.fn();
    const save = jest.fn();
    render(undefined, { savePrefillConfig, save });
    await user.selectOptions(
      screen.getByRole('combobox', { name: textMock('schema_editor.prefill.source') }),
      'ER',
    );
    savePrefillConfig.mockClear();
    save.mockClear();
    await user.selectOptions(
      screen.getByRole('combobox', { name: textMock('schema_editor.prefill.field') }),
      'OrgNumber',
    );
    expect(savePrefillConfig).toHaveBeenCalledTimes(1);
    expect(savePrefillConfig).toHaveBeenCalledWith({ ER: { OrgNumber: dataBindingName } });

    expect(save).toHaveBeenCalledTimes(1);
    const savedModel: SchemaModel = save.mock.calls[0][0];
    expect(savedModel.getNodeBySchemaPointer(schemaPointer)).toEqual({
      ...fieldNodeMock,
      prefill: { source: PrefillSource.ER, key: 'OrgNumber' },
    });
  });

  it('Shows a text input for query parameter name when QueryParameters is selected as source', async () => {
    render();
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
    render(undefined, { savePrefillConfig });
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
    render(
      { prefill: { source: PrefillSource.ER, key: 'OrgNumber' } },
      { prefillConfig, savePrefillConfig },
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: textMock('schema_editor.prefill.source') }),
      '',
    );
    expect(savePrefillConfig).toHaveBeenCalledWith({});
  });

  it('Removes the mapping when the field selection is cleared for a known-field source', async () => {
    const savePrefillConfig = jest.fn();
    const prefillConfig: PrefillConfig = { ER: { OrgNumber: dataBindingName } };
    render(
      { prefill: { source: PrefillSource.ER, key: 'OrgNumber' } },
      { prefillConfig, savePrefillConfig },
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: textMock('schema_editor.prefill.field') }),
      textMock('schema_editor.prefill.field_placeholder'),
    );
    expect(savePrefillConfig).toHaveBeenCalledWith({});
  });

  it('Removes the mapping when the query parameter name is cleared on blur', async () => {
    const savePrefillConfig = jest.fn();
    const prefillConfig: PrefillConfig = { QueryParameters: { caseId: dataBindingName } };
    render(
      { prefill: { source: PrefillSource.QueryParameters, key: 'caseId' } },
      { prefillConfig, savePrefillConfig },
    );
    const queryParamInput = screen.getByRole('textbox', {
      name: textMock('schema_editor.prefill.query_parameter'),
    });
    await user.clear(queryParamInput);
    await user.tab();
    expect(savePrefillConfig).toHaveBeenCalledWith({});
  });

  it('Preserves unrelated prefill mappings when saving a new mapping', async () => {
    const savePrefillConfig = jest.fn();
    const prefillConfig: PrefillConfig = { ER: { Name: 'someOtherField' } };
    render(undefined, { prefillConfig, savePrefillConfig });
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

  it('Clears the stale mapping on another field when this field claims its source/key', async () => {
    const otherFieldNodeMock: FieldNode = {
      ...fieldNodeMock,
      schemaPointer: otherSchemaPointer,
      prefill: { source: PrefillSource.ER, key: 'OrgNumber' },
    };
    const schemaModel = SchemaModel.fromArray([fieldNodeMock, otherFieldNodeMock]);
    const save = jest.fn();
    const prefillConfig: PrefillConfig = { ER: { OrgNumber: 'otherField' } };
    render(undefined, { schemaModel, save, prefillConfig });

    await user.selectOptions(
      screen.getByRole('combobox', { name: textMock('schema_editor.prefill.source') }),
      'ER',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: textMock('schema_editor.prefill.field') }),
      'OrgNumber',
    );

    const savedModel: SchemaModel = save.mock.calls[save.mock.calls.length - 1][0];
    expect(savedModel.getNodeBySchemaPointer(schemaPointer)).toEqual({
      ...fieldNodeMock,
      prefill: { source: PrefillSource.ER, key: 'OrgNumber' },
    });
    expect(savedModel.getNodeBySchemaPointer(otherSchemaPointer)).toEqual({
      ...fieldNodeMock,
      schemaPointer: otherSchemaPointer,
    });
  });
});

const render = (
  props?: Partial<PrefillSectionProps>,
  appContextProps?: Partial<SchemaEditorAppContextProps>,
) =>
  renderWithProviders({
    appContextProps: {
      schemaModel: SchemaModel.fromArray([fieldNodeMock]),
      ...appContextProps,
    },
  })(<PrefillSection schemaPointer={schemaPointer} {...props} />);
