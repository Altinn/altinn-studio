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
import type { DragAndDropTreeProviderProps } from 'app-shared/components/DragAndDropTree/DragAndDropTreeProvider';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { act, screen } from '@testing-library/react';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

const initialModel = SchemaModel.fromArray(uiSchemaNodesMock);
const createSchemaModel = () => initialModel.deepClone();
const setSelectedNodePointer = jest.fn();
const setSelectedTypePointer = jest.fn();
const save = jest.fn();
const name = 'Test';

const defaultProps: NodePanelProps = {
  pointer: undefined,
};

const defaultAppContextProps: SchemaEditorAppContextProps = {
  schemaModel: initialModel,
  selectedNodePointer: null,
  selectedTypePointer: null,
  setSelectedNodePointer,
  setSelectedTypePointer,
  save,
  name,
};

const defaultDragAndDropTreeProviderProps: Omit<
  DragAndDropTreeProviderProps<string>,
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

    it('Does not render a back to datamodel button', () => {
      renderNodePanelWithRootNode();
      const backButton = screen.queryByRole('button', { name: backButtonName });
      expect(backButton).not.toBeInTheDocument();
    });

    const renderNodePanelWithRootNode = () => {
      const props: Partial<NodePanelProps> = {
        pointer: undefined,
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
      const definitionName = extractNameFromPointer(definitionNodeMock.pointer);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveAccessibleName(definitionName);
    });

    it('Renders the schema tree', () => {
      renderNodePanelWithObjectDefinition();
      const schemaTree = screen.getByRole('tree');
      expect(schemaTree).toBeInTheDocument();
    });

    it('Renders a back to datamodel button', () => {
      renderNodePanelWithObjectDefinition();
      const backButton = screen.getByRole('button', { name: backButtonName });
      expect(backButton).toBeInTheDocument();
    });

    it('Navigates back to the datamodel when the back to datamodel button is clicked', async () => {
      const user = userEvent.setup();
      renderNodePanelWithObjectDefinition();
      const backButton = screen.getByRole('button', { name: backButtonName });
      await act(() => user.click(backButton));
      expect(setSelectedTypePointer).toHaveBeenCalledTimes(1);
      expect(setSelectedTypePointer).toHaveBeenCalledWith(undefined);
      expect(setSelectedNodePointer).toHaveBeenCalledTimes(1);
      expect(setSelectedNodePointer).toHaveBeenCalledWith(undefined);
    });

    const renderNodePanelWithObjectDefinition = () => {
      const props: Partial<NodePanelProps> = {
        pointer: definitionNodeMock.pointer,
      };
      const appContextProps: Partial<SchemaEditorAppContextProps> = {
        schemaModel: createSchemaModel(),
        selectedTypePointer: definitionNodeMock.pointer,
      };
      return renderNodePanel({ props, appContextProps });
    };
  });

  describe('When a string definition is selected', () => {
    it('Renders the name as the heading', () => {
      renderNodePanelWithStringDefinition();
      const definitionName = extractNameFromPointer(stringDefinitionNodeMock.pointer);
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
        pointer: stringDefinitionNodeMock.pointer,
      };
      const appContextProps: Partial<SchemaEditorAppContextProps> = {
        schemaModel: createSchemaModel(),
        selectedTypePointer: stringDefinitionNodeMock.pointer,
      };
      return renderNodePanel({ props, appContextProps });
    };
  });

  const backButtonName = textMock('schema_editor.back_to_datamodel');
});

type RenderNodePanelProps = {
  props?: Partial<NodePanelProps>;
  appContextProps?: Partial<SchemaEditorAppContextProps>;
  dragAndDropTreeProviderProps?: Partial<DragAndDropTreeProviderProps<string>>;
};

const renderNodePanel = (
  { props = {}, appContextProps = {}, dragAndDropTreeProviderProps = {} }: RenderNodePanelProps = {
    props: {},
    appContextProps: {},
    dragAndDropTreeProviderProps: {},
  },
) =>
  renderWithProviders({ appContextProps: { ...defaultAppContextProps, ...appContextProps } })(
    <DragAndDropTree.Provider<string>
      {...defaultDragAndDropTreeProviderProps}
      {...dragAndDropTreeProviderProps}
    >
      <NodePanel {...defaultProps} {...props} />
    </DragAndDropTree.Provider>,
  );
