import {renderWithRedux} from "../../../test/renderWithRedux";
import {IItemDataComponentProps, ItemDataComponent} from "./ItemDataComponent";
import {
  CombinationKind,
  createChildNode,
  createNodeBase,
  FieldType,
  Keywords,
  ObjectKind
} from "@altinn/schema-model";
import React from "react";

const mockLanguage = {
  schema_editor: {
    description: 'Description',
    descriptive_fields: 'Descriptive fields',
    go_to_type: 'Go to type',
    multiple_answers: 'Multiple answers',
    name: 'Name',
    nullable: 'Nullable',
    reference_to: 'Reference to',
    title: 'Title',
    type: 'Type'
  }
};

const parentNode = createNodeBase(Keywords.Properties, 'test');
parentNode.objectKind = ObjectKind.Combination;
parentNode.fieldType = CombinationKind.AnyOf;
const uiSchemaNodes = [parentNode];
['Donald', 'Dolly'].forEach((childNodeName) => {
  const childNode = createChildNode(parentNode, childNodeName, false);
  childNode.fieldType = FieldType.String;
  parentNode.children.push(childNode.pointer);
  uiSchemaNodes.push(childNode);
});

const renderItemDataComponent = (props?: Partial<IItemDataComponentProps>, selectedItemIndex: number = 0) => {
  return renderWithRedux(
    <ItemDataComponent
      checkIsNameInUse={jest.fn()}
      language={mockLanguage}
      selectedItem={uiSchemaNodes[selectedItemIndex]}
      {...props}
    />,
    {uiSchema: uiSchemaNodes}
  );
};

test('"Multiple answers" checkbox should appear if selected item is field', () => {
  const { renderResult } = renderItemDataComponent({}, 1);
  expect(renderResult.container.querySelector('input[name="checkedMultipleAnswers"]')).toBeDefined();
});

test('"Multiple answers" checkbox should not appear if selected item is combination', () => {
  const { renderResult } = renderItemDataComponent({}, 0);
  expect(renderResult.container.querySelector('input[name="checkedMultipleAnswers"]')).toBeNull();
});

test('setType is called when "multiple answers" checkbox is checked', async () => {
  const { store, user, renderResult } = renderItemDataComponent({}, 1);
  const checkbox = renderResult.container.querySelector('input[name="checkedMultipleAnswers"]');
  if (checkbox === null) fail();
  await user.click(checkbox);
  expect(store.getActions().some(({type}) => type === 'schemaEditor/setType')).toBeTruthy();
});

test('"Nullable" checkbox should appear if selected item is combination', () => {
  const { renderResult } = renderItemDataComponent({}, 0);
  expect(renderResult.container.querySelector('input[name="checkedNullable"]')).toBeDefined();
});

test('"Nullable" checkbox should not appear if selected item is not combination', () => {
  const { renderResult } = renderItemDataComponent({}, 1);
  expect(renderResult.container.querySelector('input[name="checkedNullable"]')).toBeNull();
});

test('addCombinationItem is called when "nullable" checkbox is checked', async () => {
  const { store, user, renderResult } = renderItemDataComponent({}, 0);
  const checkbox = renderResult.container.querySelector('input[name="checkedNullable"]');
  if (checkbox === null) fail();
  await user.click(checkbox);
  expect(store.getActions().some(({type}) => type === 'schemaEditor/addCombinationItem')).toBeTruthy();
});

