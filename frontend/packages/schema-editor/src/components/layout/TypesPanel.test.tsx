import React from 'react';
import { dataMock } from '../../mockData';
import { screen } from '@testing-library/react';

import { TypesPanel, TypesPanelProps } from './TypesPanel';
import { buildUiSchema, FieldType, ObjectKind } from '@altinn/schema-model';
import { mockUseTranslation } from '../../../../../testing/mocks/i18nMock';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { SchemaState } from '@altinn/schema-editor/types';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

const typesText = 'Typer';
const texts = {
  'schema_editor.add': 'Legg til',
  'schema_editor.add_element': 'Add Element',
  'schema_editor.add_property': 'Legg til felt',
  'schema_editor.add_reference': 'Legg til referanse',
  'schema_editor.delete': 'Slett',
  'schema_editor.field': 'Felt',
  'schema_editor.reference': 'Referanse',
  'schema_editor.types': typesText,
};
const uiSchema = buildUiSchema(dataMock);
const org = 'org';
const app = 'app';
const modelPath = 'test';
queryClientMock.setQueryData([QueryKey.Datamodel, org, app, modelPath], uiSchema);
// Mocks:
jest.mock('react-i18next', () => ({ useTranslation: () => mockUseTranslation(texts) }));

const render = (props?: Partial<TypesPanelProps>) => {
  const mockInitialState: SchemaState = {
    name: 'test',
    selectedDefinitionNodeId: '',
    selectedPropertyNodeId: '',
    selectedEditorTab: 'properties',
  };

  const defaultProps: TypesPanelProps = {
    uiSchemaNode: {
      children: [],
      custom: {},
      fieldType: FieldType.Object,
      implicitType: false,
      isArray: false,
      isCombinationItem: false,
      isNillable: false,
      isRequired: false,
      objectKind: ObjectKind.Field,
      pointer: '#/$defs/TestType',
      restrictions: {},
    },
    expandedDefNodes: [],
    setExpandedDefNodes: () => {},
  };
  return renderWithProviders({
    state: mockInitialState,
    appContextProps: { modelPath },
  })(<TypesPanel {...defaultProps} {...props} />);
};

describe('TypesPanel', () => {
  it('should render the tree view for the supplied type', () => {
    render();
    expect(screen.getByRole('button', { name: 'Legg til' })).toBeInTheDocument();
    expect(screen.getByText('TestType')).toBeInTheDocument();
  });
});
