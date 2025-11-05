import { HeadingRow } from './HeadingRow';
import type { HeadingRowProps } from './HeadingRow';
import React from 'react';
import type { SchemaEditorAppContextProps } from '../../../contexts/SchemaEditorAppContext';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { extractNameFromPointer, ROOT_POINTER, SchemaModel } from '@altinn/schema-model';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
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
const setSelectedUniquePointer = jest.fn();
const setSelectedTypePointer = jest.fn();
const save = jest.fn();
const dataModelName = 'Test';

const defaultProps: HeadingRowProps = {
  schemaPointer: undefined,
};

const defaultAppContextProps: SchemaEditorAppContextProps = {
  schemaModel: initialModel,
  selectedUniquePointer: null,
  selectedTypePointer: null,
  setSelectedUniquePointer,
  setSelectedTypePointer,
  save,
  name: dataModelName,
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
    it('Renders a level one heading with the name of the data model', () => {
      renderHeadingRow();
      expect(screen.getByRole('heading', { level: 1, name: dataModelName })).toBeInTheDocument();
    });

    it('Selects the root node when clicking the name', async () => {
      const user = userEvent.setup();
      renderHeadingRow();
      await user.click(screen.getByRole('button', { name: dataModelName }));
      expect(setSelectedUniquePointer).toHaveBeenCalledTimes(1);
      expect(setSelectedUniquePointer).toHaveBeenCalledWith(ROOT_POINTER);
    });

    it.each(['combination', 'object', 'string', 'integer', 'number', 'boolean'])(
      'Adds a node to the root and selects it when adding a %s node',
      async (type: string) => {
        const user = userEvent.setup();
        const schemaModel = createSchemaModel();
        const numberOfRootChildrenBefore = schemaModel.getRootChildren().length;
        renderHeadingRow({ appContextProps: { schemaModel } });
        await user.click(getAddButton());
        await user.click(getAddMenuitem(type));
        expect(save).toHaveBeenCalledTimes(1);
        const savedModel = save.mock.calls[0][0];
        expect(savedModel.getNodeMap()).toBe(schemaModel.getNodeMap());
        const numberOfRootChildrenAfter = schemaModel.getRootChildren().length;
        expect(numberOfRootChildrenAfter).toBe(numberOfRootChildrenBefore + 1);
        expect(setSelectedUniquePointer).toHaveBeenCalledTimes(1);
      },
    );

    it('Does not display a delete button', () => {
      renderHeadingRow();
      const deleteButton = screen.queryByRole('button', { name: textMock('general.delete') });
      expect(deleteButton).not.toBeInTheDocument();
    });

    it('Renders with the "selected" class name when the root node is selected', () => {
      const selectedUniquePointer = ROOT_POINTER;
      const appContextProps: Partial<SchemaEditorAppContextProps> = { selectedUniquePointer };
      const { container } = renderHeadingRow({ appContextProps });
      expect(container.firstChild).toHaveClass('selected'); // eslint-disable-line testing-library/no-node-access
    });
  });

  describe('When a type is selected', () => {
    type TestCase = {
      schemaPointer: string;
      canHaveChildren: boolean;
      isInUse: boolean;
    };

    const testCases: KeyValuePairs<TestCase> = {
      'an object definition in use': {
        schemaPointer: objectDefinitionPointer,
        canHaveChildren: true,
        isInUse: true,
      },
      'a string definition in use': {
        schemaPointer: stringDefinitionPointer,
        canHaveChildren: false,
        isInUse: true,
      },
      'an integer definition in use': {
        schemaPointer: integerDefinitionPointer,
        canHaveChildren: false,
        isInUse: true,
      },
      'a number definition in use': {
        schemaPointer: numberDefinitionPointer,
        canHaveChildren: false,
        isInUse: true,
      },
      'a boolean definition in use': {
        schemaPointer: booleanDefinitionPointer,
        canHaveChildren: false,
        isInUse: true,
      },
      'a combination definition in use': {
        schemaPointer: combinationDefinitionPointer,
        canHaveChildren: true,
        isInUse: true,
      },
      'an unused object definition': {
        schemaPointer: unusedObjectDefinitionPointer,
        canHaveChildren: true,
        isInUse: false,
      },
      'an unused string definition': {
        schemaPointer: unusedStringDefinitionPointer,
        canHaveChildren: false,
        isInUse: false,
      },
      'an unused integer definition': {
        schemaPointer: unusedIntegerDefinitionPointer,
        canHaveChildren: false,
        isInUse: false,
      },
      'an unused number definition': {
        schemaPointer: unusedNumberDefinitionPointer,
        canHaveChildren: false,
        isInUse: false,
      },
      'an unused boolean definition': {
        schemaPointer: unusedBooleanDefinitionPointer,
        canHaveChildren: false,
        isInUse: false,
      },
      'an unused combination definition': {
        schemaPointer: unusedCombinationDefinitionPointer,
        canHaveChildren: true,
        isInUse: false,
      },
    };

    const testCaseNames: (keyof typeof testCases)[] = Object.keys(testCases);

    describe.each(testCaseNames)('When the type is %s', (testCaseName) => {
      const { schemaPointer, canHaveChildren, isInUse } = testCases[testCaseName];
      const name = extractNameFromPointer(schemaPointer);

      it('Renders a level one heading with the name of the type', () => {
        renderHeadingRowForType(schemaPointer);
        expect(screen.getByRole('heading', { level: 1, name })).toBeInTheDocument();
      });

      it('Selects the type when clicking the name', async () => {
        const user = userEvent.setup();
        renderHeadingRowForType(schemaPointer);
        await user.click(screen.getByRole('button', { name }));
        expect(setSelectedUniquePointer).toHaveBeenCalledTimes(1);
        expect(setSelectedUniquePointer).toHaveBeenCalledWith(schemaPointer);
      });

      if (canHaveChildren) {
        it.each(['combination', 'object', 'string', 'integer', 'number', 'boolean'])(
          'Adds a node to the type and selects it when adding a %s node',
          async (type: string) => {
            const user = userEvent.setup();
            const schemaModel = createSchemaModel();
            const numberOfChildrenBefore = schemaModel.getChildNodes(schemaPointer).length;
            renderHeadingRowForType(schemaPointer, { schemaModel });
            await user.click(getAddButton());
            await user.click(getAddMenuitem(type));
            expect(save).toHaveBeenCalledTimes(1);
            const savedModel = save.mock.calls[0][0];
            expect(savedModel.getNodeMap()).toBe(schemaModel.getNodeMap());
            const numberOfChildrenAfter = schemaModel.getChildNodes(schemaPointer).length;
            expect(numberOfChildrenAfter).toBe(numberOfChildrenBefore + 1);
            expect(setSelectedUniquePointer).toHaveBeenCalledTimes(1);
          },
        );
      } else {
        it('Does not display an add button', () => {
          renderHeadingRowForType(schemaPointer);
          const addButton = screen.queryByRole('button', { name: addButtonTitle });
          expect(addButton).not.toBeInTheDocument();
        });
      }

      if (isInUse) {
        it('Renders the delete button as disabled', () => {
          renderHeadingRowForType(schemaPointer);
          expect(getDeleteButton()).toBeDisabled();
        });
      } else {
        it('Deletes and unselects the node when clicking the delete button and confirming', async () => {
          const user = userEvent.setup();
          const schemaModel = createSchemaModel();
          jest.spyOn(window, 'confirm').mockImplementation(() => true);
          renderHeadingRowForType(schemaPointer, { schemaModel });
          await user.click(getDeleteButton());
          expect(save).toHaveBeenCalledTimes(1);
          const savedModel = save.mock.calls[0][0];
          expect(savedModel.getNodeMap()).toBe(schemaModel.getNodeMap());
          expect(schemaModel.hasNode(schemaPointer)).toBe(false);
          expect(setSelectedTypePointer).toHaveBeenCalledTimes(1);
          expect(setSelectedTypePointer).toHaveBeenCalledWith(null);
          expect(setSelectedUniquePointer).toHaveBeenCalledTimes(1);
          expect(setSelectedUniquePointer).toHaveBeenCalledWith(null);
        });
      }

      it('Renders with the "selected" class name when the root node is selected', () => {
        const selectedUniquePointer = schemaPointer;
        const appContextProps: Partial<SchemaEditorAppContextProps> = { selectedUniquePointer };
        const { container } = renderHeadingRowForType(schemaPointer, appContextProps);
        expect(container.firstChild).toHaveClass('selected'); // eslint-disable-line testing-library/no-node-access
      });
    });

    const renderHeadingRowForType = (
      schemaPointer: string,
      additionalContextProps: Partial<SchemaEditorAppContextProps> = {},
    ) => {
      const props: Partial<HeadingRowProps> = { schemaPointer };
      const appContextProps: Partial<SchemaEditorAppContextProps> = {
        selectedTypePointer: schemaPointer,
        ...additionalContextProps,
      };
      return renderHeadingRow({ props, appContextProps });
    };
  });

  const addButtonTitle = textMock('schema_editor.add_node_of_type');
  const getAddButton = () => screen.getByRole('button', { name: addButtonTitle });
  const getAddMenuitem = (type: string) =>
    screen.getByRole('button', { name: textMock('schema_editor.' + type) });
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
