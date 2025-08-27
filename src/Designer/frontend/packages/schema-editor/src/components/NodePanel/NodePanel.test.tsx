import { renderWithProviders } from '../../../test/renderWithProviders';
import React from 'react';
import type { SchemaEditorAppContextProps } from '../../contexts/SchemaEditorAppContext';
import { NodePanel } from './';
import type { NodePanelProps } from './';
import { extractNameFromPointer, ROOT_POINTER, SchemaModel } from '@altinn/schema-model';
import {
  definitionNodeMock,
  stringDefinitionNodeMock,
  uiSchemaNodesMock,
} from '../../../test/mocks/uiSchemaMock';
import type { StudioDragAndDropTreeProviderProps } from '@studio/components-legacy';
import { StudioDragAndDropTree } from '@studio/components-legacy';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

const initialModel = SchemaModel.fromArray(uiSchemaNodesMock);
const createSchemaModel = () => initialModel.deepClone();
const setSelectedUniquePointer = jest.fn();
const setSelectedTypePointer = jest.fn();
const save = jest.fn();
const name = 'Test';

const defaultProps: NodePanelProps = {
  schemaPointer: undefined,
};

const defaultAppContextProps: SchemaEditorAppContextProps = {
  schemaModel: initialModel,
  selectedUniquePointer: null,
  selectedTypePointer: null,
  setSelectedUniquePointer,
  setSelectedTypePointer,
  save,
  name,
};

const defaultDragAndDropTreeProviderProps: Omit<
  StudioDragAndDropTreeProviderProps<string>,
  'children'
> = {
  onAdd: jest.fn(),
  onMove: jest.fn(),
  rootId: ROOT_POINTER,
};

describe('NodePanel', () => {
  afterEach(jest.clearAllMocks);

  describe('When the root node is selected', () => {
    it('Renders the name as the heading', () => {
      renderNodePanelWithRootNode();
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveAccessibleName(name);
    });

    it('Renders the schema tree', () => {
      renderNodePanelWithRootNode();
      const schemaTree = screen.getByRole('tree');
      expect(schemaTree).toBeInTheDocument();
    });

    it('Does not render a back to data model button', () => {
      renderNodePanelWithRootNode();
      const backButton = screen.queryByRole('button', { name: backButtonName });
      expect(backButton).not.toBeInTheDocument();
    });

    const renderNodePanelWithRootNode = () => {
      const props: Partial<NodePanelProps> = {
        schemaPointer: undefined,
      };
      const appContextProps: Partial<SchemaEditorAppContextProps> = {
        schemaModel: createSchemaModel(),
      };
      return renderNodePanel({ props, appContextProps });
    };
  });

  describe('When an object definition is selected', () => {
    it('Renders the name as the heading', () => {
      renderNodePanelWithObjectDefinition();
      const definitionName = extractNameFromPointer(definitionNodeMock.schemaPointer);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveAccessibleName(definitionName);
    });

    it('Renders the schema tree', () => {
      renderNodePanelWithObjectDefinition();
      const schemaTree = screen.getByRole('tree');
      expect(schemaTree).toBeInTheDocument();
    });

    it('Renders a back to data model button', () => {
      renderNodePanelWithObjectDefinition();
      const backButton = screen.getByRole('button', { name: backButtonName });
      expect(backButton).toBeInTheDocument();
    });

    it('Navigates back to the data model when the back to data model button is clicked', async () => {
      const user = userEvent.setup();
      renderNodePanelWithObjectDefinition();
      const backButton = screen.getByRole('button', { name: backButtonName });
      await user.click(backButton);
      expect(setSelectedTypePointer).toHaveBeenCalledTimes(1);
      expect(setSelectedTypePointer).toHaveBeenCalledWith(undefined);
      expect(setSelectedUniquePointer).toHaveBeenCalledTimes(1);
      expect(setSelectedUniquePointer).toHaveBeenCalledWith(undefined);
    });

    const renderNodePanelWithObjectDefinition = () => {
      const props: Partial<NodePanelProps> = {
        schemaPointer: definitionNodeMock.schemaPointer,
      };
      const appContextProps: Partial<SchemaEditorAppContextProps> = {
        schemaModel: createSchemaModel(),
        selectedTypePointer: definitionNodeMock.schemaPointer,
      };
      return renderNodePanel({ props, appContextProps });
    };
  });

  describe('When a string definition is selected', () => {
    it('Renders the name as the heading', () => {
      renderNodePanelWithStringDefinition();
      const definitionName = extractNameFromPointer(stringDefinitionNodeMock.schemaPointer);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveAccessibleName(definitionName);
    });

    it('Does not render a schema tree', () => {
      renderNodePanelWithStringDefinition();
      const schemaTree = screen.queryByRole('tree');
      expect(schemaTree).not.toBeInTheDocument();
    });

    const renderNodePanelWithStringDefinition = () => {
      const props: Partial<NodePanelProps> = {
        schemaPointer: stringDefinitionNodeMock.schemaPointer,
      };
      const appContextProps: Partial<SchemaEditorAppContextProps> = {
        schemaModel: createSchemaModel(),
        selectedTypePointer: stringDefinitionNodeMock.schemaPointer,
      };
      return renderNodePanel({ props, appContextProps });
    };
  });

  const backButtonName = textMock('schema_editor.back_to_data_model');
});

type RenderNodePanelProps = {
  props?: Partial<NodePanelProps>;
  appContextProps?: Partial<SchemaEditorAppContextProps>;
  dragAndDropTreeProviderProps?: Partial<StudioDragAndDropTreeProviderProps<string>>;
};

const renderNodePanel = (
  { props = {}, appContextProps = {}, dragAndDropTreeProviderProps = {} }: RenderNodePanelProps = {
    props: {},
    appContextProps: {},
    dragAndDropTreeProviderProps: {},
  },
) =>
  renderWithProviders({ appContextProps: { ...defaultAppContextProps, ...appContextProps } })(
    <StudioDragAndDropTree.Provider<string>
      {...defaultDragAndDropTreeProviderProps}
      {...dragAndDropTreeProviderProps}
    >
      <NodePanel {...defaultProps} {...props} />
    </StudioDragAndDropTree.Provider>,
  );
