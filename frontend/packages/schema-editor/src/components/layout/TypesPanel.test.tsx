import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { dataMock } from '../../mockData';
import { render as rtlRender, screen } from '@testing-library/react';

import userEvent from '@testing-library/user-event';
import { TypesPanel, TypesPanelProps } from './TypesPanel';
import { buildUiSchema, FieldType, ObjectKind } from '@altinn/schema-model';
import { mockUseTranslation } from '../../../../../testing/mocks/i18nMock';

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
// Mocks:
jest.mock('react-i18next', () => ({ useTranslation: () => mockUseTranslation(texts) }));

const render = (props?: Partial<TypesPanelProps>, editMode?: boolean) => {
  const mockInitialState = {
    name: 'test',
    saveSchemaUrl: '',
    schema: dataMock,
    uiSchema: uiSchema,
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
    editMode: editMode === undefined ? true : editMode,
    expandedDefNodes: [],
    setExpandedDefNodes: () => {},
  };
  const store = configureStore()({
    ...mockInitialState,
  });
  const user = userEvent.setup();
  rtlRender(
    <Provider store={store}>
      <TypesPanel {...defaultProps} {...props} />
    </Provider>
  );
  return { store, user };
};

describe('TypesPanel', () => {
  it('should render the tree view for the supplied type', () => {
    render();
    expect(screen.getByRole('button', { name: 'Legg til' })).toBeInTheDocument();
    expect(screen.getByText('TestType')).toBeInTheDocument();
  });
});
