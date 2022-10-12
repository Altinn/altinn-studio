import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithRedux } from '../../../test/renderWithRedux';
import { ItemRestrictions, ItemRestrictionsProps } from './ItemRestrictions';
import { CombinationKind, createNodeBase, FieldType, Keywords, ObjectKind, UiSchemaNode } from '@altinn/schema-model';

// Test data:
const mockLanguage = {
  schema_editor: {
    enum_legend: 'Liste med gyldige verdier'
  }
};
const mockSelectedNode = createNodeBase(Keywords.Properties, 'test');
const defaultProps: ItemRestrictionsProps = { language: mockLanguage, selectedNode: mockSelectedNode };

test('item restrictions require checkbox to work', async () => {
  const selectedNode = createNode({ fieldType: FieldType.String });
  const { user, store } = renderItemRestrictions({ selectedNode });
  await user.click(screen.getByRole('checkbox'));
  const action = store.getActions().pop();
  expect(action.type).toBe('schemaEditor/setRequired');
  expect(action.payload.required).toBeTruthy();
});

test('item restrictions tab require checkbox to decheck', async () => {
  const selectedNode = createNode({ fieldType: FieldType.String, isRequired: true });
  const { user, store } = renderItemRestrictions({ selectedNode });
  await user.click(screen.getByRole('checkbox'));
  const action = store.getActions().pop();
  expect(action.type).toBe('schemaEditor/setRequired');
  expect(action.payload.required).toBeFalsy();
});

test('Enum list should only appear for strings and numbers, as well as arrays of those', () => {
  const { enum_legend  } = mockLanguage.schema_editor;
  (Object.values(FieldType) as (FieldType | CombinationKind)[])
    .concat(Object.values(CombinationKind))
    .filter((fieldType) => fieldType !== FieldType.Array)
    .forEach((fieldType) => {
      const primitiveProps = { selectedNode: createNode({ fieldType }) };
      const arrayProps = {
        selectedNode: createNode({
          children: ['arraytest/item'],
          fieldType: FieldType.Array,
          objectKind: ObjectKind.Array,
          pointer: 'arraytest'
        }),
        itemsNode: createNode({ fieldType, pointer: 'arraytest/item' })
      };
      for (const props of [primitiveProps, arrayProps]) {
        const { renderResult } = renderItemRestrictions(props);
        switch (fieldType) {
          case FieldType.String:
          case FieldType.Number:
          case FieldType.Integer:
            expect(screen.getByText(enum_legend)).toBeDefined();
            break;
          default:
            expect(screen.queryByText(enum_legend)).toBeFalsy();
        }
        renderResult.unmount();
      }
    });
});

const renderItemRestrictions = (props?: Partial<ItemRestrictionsProps>) =>
  renderWithRedux(<ItemRestrictions {...defaultProps} {...props}/>);

const createNode = (props: Partial<UiSchemaNode>): UiSchemaNode => ({...mockSelectedNode, ...props});
