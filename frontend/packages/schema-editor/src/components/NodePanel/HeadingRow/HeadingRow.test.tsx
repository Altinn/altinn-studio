import { HeadingRow } from './HeadingRow';
import type { HeadingRowProps } from './HeadingRow';
import React from 'react';
import type { SchemaEditorAppContextProps } from '../../../contexts/SchemaEditorAppContext';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { extractNameFromPointer, ROOT_POINTER, SchemaModel } from '@altinn/schema-model';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import {
  booleanDefinitionPointer,
  combinationDefinitionPointer,
  integerDefinitionPointer,
  numberDefinitionPointer,
  objectDefinitionPointer,
  schemaNodesMock,
  stringDefinitionPointer,
  unusedBooleanDefinitionPointer,
  unusedCombinationDefinitionPointer,
  unusedIntegerDefinitionPointer,
  unusedNumberDefinitionPointer,
  unusedObjectDefinitionPointer,
  unusedStringDefinitionPointer,
} from './test-data';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

// Test data:
const initialModel = SchemaModel.fromArray(schemaNodesMock);
const createSchemaModel = () => initialModel.deepClone();
const setSelectedNodePointer = jest.fn();
const setSelectedTypePointer = jest.fn();
const save = jest.fn();
const datamodelName = 'Test';

const defaultProps: HeadingRowProps = {
  pointer: undefined,
};

const defaultAppContextProps: SchemaEditorAppContextProps = {
  schemaModel: initialModel,
  selectedNodePointer: null,
  selectedTypePointer: null,
  setSelectedNodePointer,
  setSelectedTypePointer,
  save,
  name: datamodelName,
};

// Mocks:
jest.mock('./HeadingRow.module.css', () => ({
  root: 'root',
  selected: 'selected',
  heading: 'heading',
  headingButton: 'headingButton',
}));

describe('HeadingRow', () => {
  afterEach(jest.clearAllMocks);

  describe('When no type is selected', () => {
    it('Renders a level one heading with the name of the datamodel', () => {
      renderHeadingRow();
      expect(screen.getByRole('heading', { level: 1, name: datamodelName })).toBeInTheDocument();
    });

    it('Selects the root node when clicking the name', async () => {
      const user = userEvent.setup();
      renderHeadingRow();
      await act(() => user.click(screen.getByRole('button', { name: datamodelName })));
      expect(setSelectedNodePointer).toHaveBeenCalledTimes(1);
      expect(setSelectedNodePointer).toHaveBeenCalledWith(ROOT_POINTER);
    });

    it.each(['combination', 'object', 'string', 'integer', 'number', 'boolean'])(
      'Adds a node to the root and selects it when adding a %s node',
      async (type: string) => {
        const user = userEvent.setup();
        const schemaModel = createSchemaModel();
        const numberOfRootChildrenBefore = schemaModel.getRootChildren().length;
        renderHeadingRow({ appContextProps: { schemaModel } });
        await act(() => user.click(getAddButton()));
        await act(() => user.click(getAddMenuitem(type)));
        expect(save).toHaveBeenCalledTimes(1);
        const savedModel = save.mock.calls[0][0];
        expect(savedModel.getNodeMap()).toBe(schemaModel.getNodeMap());
        const numberOfRootChildrenAfter = schemaModel.getRootChildren().length;
        expect(numberOfRootChildrenAfter).toBe(numberOfRootChildrenBefore + 1);
        expect(setSelectedNodePointer).toHaveBeenCalledTimes(1);
      },
    );

    it('Does not display a delete button', () => {
      renderHeadingRow();
      const deleteButton = screen.queryByRole('button', { name: textMock('general.delete') });
      expect(deleteButton).not.toBeInTheDocument();
    });

    it('Renders with the "selected" class name when the root node is selected', () => {
      const selectedNodePointer = ROOT_POINTER;
      const appContextProps: Partial<SchemaEditorAppContextProps> = { selectedNodePointer };
      const { container } = renderHeadingRow({ appContextProps });
      expect(container.firstChild).toHaveClass('selected'); // eslint-disable-line testing-library/no-node-access
    });
  });

  describe('When a type is selected', () => {
    type TestCase = {
      pointer: string;
      canHaveChildren: boolean;
      isInUse: boolean;
    };

    const testCases: KeyValuePairs<TestCase> = {
      'an object definition in use': {
        pointer: objectDefinitionPointer,
        canHaveChildren: true,
        isInUse: true,
      },
      'a string definition in use': {
        pointer: stringDefinitionPointer,
        canHaveChildren: false,
        isInUse: true,
      },
      'an integer definition in use': {
        pointer: integerDefinitionPointer,
        canHaveChildren: false,
        isInUse: true,
      },
      'a number definition in use': {
        pointer: numberDefinitionPointer,
        canHaveChildren: false,
        isInUse: true,
      },
      'a boolean definition in use': {
        pointer: booleanDefinitionPointer,
        canHaveChildren: false,
        isInUse: true,
      },
      'a combination definition in use': {
        pointer: combinationDefinitionPointer,
        canHaveChildren: true,
        isInUse: true,
      },
      'an unused object definition': {
        pointer: unusedObjectDefinitionPointer,
        canHaveChildren: true,
        isInUse: false,
      },
      'an unused string definition': {
        pointer: unusedStringDefinitionPointer,
        canHaveChildren: false,
        isInUse: false,
      },
      'an unused integer definition': {
        pointer: unusedIntegerDefinitionPointer,
        canHaveChildren: false,
        isInUse: false,
      },
      'an unused number definition': {
        pointer: unusedNumberDefinitionPointer,
        canHaveChildren: false,
        isInUse: false,
      },
      'an unused boolean definition': {
        pointer: unusedBooleanDefinitionPointer,
        canHaveChildren: false,
        isInUse: false,
      },
      'an unused combination definition': {
        pointer: unusedCombinationDefinitionPointer,
        canHaveChildren: true,
        isInUse: false,
      },
    };

    const testCaseNames: (keyof typeof testCases)[] = Object.keys(testCases);

    describe.each(testCaseNames)('When the type is %s', (testCaseName) => {
      const { pointer, canHaveChildren, isInUse } = testCases[testCaseName];
      const name = extractNameFromPointer(pointer);

      it('Renders a level one heading with the name of the type', () => {
        renderHeadingRowForType(pointer);
        expect(screen.getByRole('heading', { level: 1, name })).toBeInTheDocument();
      });

      it('Selects the type when clicking the name', async () => {
        const user = userEvent.setup();
        renderHeadingRowForType(pointer);
        await act(() => user.click(screen.getByRole('button', { name })));
        expect(setSelectedNodePointer).toHaveBeenCalledTimes(1);
        expect(setSelectedNodePointer).toHaveBeenCalledWith(pointer);
      });

      if (canHaveChildren) {
        it.each(['combination', 'object', 'string', 'integer', 'number', 'boolean'])(
          'Adds a node to the type and selects it when adding a %s node',
          async (type: string) => {
            const user = userEvent.setup();
            const schemaModel = createSchemaModel();
            const numberOfChildrenBefore = schemaModel.getChildNodes(pointer).length;
            renderHeadingRowForType(pointer, { schemaModel });
            await act(() => user.click(getAddButton()));
            await act(() => user.click(getAddMenuitem(type)));
            expect(save).toHaveBeenCalledTimes(1);
            const savedModel = save.mock.calls[0][0];
            expect(savedModel.getNodeMap()).toBe(schemaModel.getNodeMap());
            const numberOfChildrenAfter = schemaModel.getChildNodes(pointer).length;
            expect(numberOfChildrenAfter).toBe(numberOfChildrenBefore + 1);
            expect(setSelectedNodePointer).toHaveBeenCalledTimes(1);
          },
        );
      } else {
        it('Does not display an add button', () => {
          renderHeadingRowForType(pointer);
          const addButton = screen.queryByRole('button', { name: addButtonTitle });
          expect(addButton).not.toBeInTheDocument();
        });
      }

      if (isInUse) {
        it('Renders the delete button as disabled', () => {
          renderHeadingRowForType(pointer);
          expect(getDeleteButton()).toBeDisabled();
        });
      } else {
        it('Deletes and unselects the node when clicking the delete button and confirming', async () => {
          const user = userEvent.setup();
          const schemaModel = createSchemaModel();
          jest.spyOn(window, 'confirm').mockImplementation(() => true);
          renderHeadingRowForType(pointer, { schemaModel });
          await act(() => user.click(getDeleteButton()));
          expect(save).toHaveBeenCalledTimes(1);
          const savedModel = save.mock.calls[0][0];
          expect(savedModel.getNodeMap()).toBe(schemaModel.getNodeMap());
          expect(schemaModel.hasNode(pointer)).toBe(false);
          expect(setSelectedTypePointer).toHaveBeenCalledTimes(1);
          expect(setSelectedTypePointer).toHaveBeenCalledWith(null);
          expect(setSelectedNodePointer).toHaveBeenCalledTimes(1);
          expect(setSelectedNodePointer).toHaveBeenCalledWith(null);
        });
      }

      it('Renders with the "selected" class name when the root node is selected', () => {
        const selectedNodePointer = pointer;
        const appContextProps: Partial<SchemaEditorAppContextProps> = { selectedNodePointer };
        const { container } = renderHeadingRowForType(pointer, appContextProps);
        expect(container.firstChild).toHaveClass('selected'); // eslint-disable-line testing-library/no-node-access
      });
    });

    const renderHeadingRowForType = (
      pointer: string,
      additionalContextProps: Partial<SchemaEditorAppContextProps> = {},
    ) => {
      const props: Partial<HeadingRowProps> = { pointer };
      const appContextProps: Partial<SchemaEditorAppContextProps> = {
        selectedTypePointer: pointer,
        ...additionalContextProps,
      };
      return renderHeadingRow({ props, appContextProps });
    };
  });

  const addButtonTitle = textMock('schema_editor.add_node_of_type');
  const getAddButton = () => screen.getByRole('button', { name: addButtonTitle });
  const getAddMenuitem = (type: string) =>
    screen.getByRole('menuitem', { name: textMock('schema_editor.' + type) });
  const getDeleteButton = () => screen.getByRole('button', { name: textMock('general.delete') });
});

type RenderHeadingRowProps = {
  props?: Partial<HeadingRowProps>;
  appContextProps?: Partial<SchemaEditorAppContextProps>;
};

const renderHeadingRow = (
  { props = {}, appContextProps = {} }: RenderHeadingRowProps = {
    props: {},
    appContextProps: {},
  },
) =>
  renderWithProviders({ appContextProps: { ...defaultAppContextProps, ...appContextProps } })(
    <HeadingRow {...defaultProps} {...props} />,
  );
