import React from 'react';
import { act, screen } from '@testing-library/react';
import { renderWithRedux } from '../../../test/renderWithRedux';
import type { ItemRestrictionsProps } from './ItemRestrictions';
import { ItemRestrictions } from './ItemRestrictions';
import type { UiSchemaNode } from '@altinn/schema-model';
import {
  CombinationKind,
  createNodeBase,
  FieldType,
  Keyword,
  ObjectKind,
} from '@altinn/schema-model';
import { mockUseTranslation } from '../../../../../testing/mocks/i18nMock';

// Test data:
const legendText = 'Liste med gyldige verdier';
const texts = {
  'schema_editor.enum_legend': legendText,
};
const mockSelectedNode = createNodeBase(Keyword.Properties, 'test');
const defaultProps: ItemRestrictionsProps = { ...mockSelectedNode };

// Mocks:
jest.mock(
  'react-i18next',
  () => ({ useTranslation: () => mockUseTranslation(texts) }),
);

describe('ItemRestrictions', () => {
  test('item restrictions require checkbox to work', async () => {
    const selectedNode = createNode({ fieldType: FieldType.String });
    const { user, store } = renderItemRestrictions(selectedNode);
    await act(() => user.click(screen.getByRole('checkbox')));
    const action = store.getActions().pop();
    expect(action.type).toBe('schemaEditor/setRequired');
    expect(action.payload.required).toBeTruthy();
  });

  test('item restrictions tab require checkbox to decheck', async () => {
    const selectedNode = createNode({ fieldType: FieldType.String, isRequired: true });
    const { user, store } = renderItemRestrictions(selectedNode);
    await act(() => user.click(screen.getByRole('checkbox')));
    const action = store.getActions().pop();
    expect(action.type).toBe('schemaEditor/setRequired');
    expect(action.payload.required).toBeFalsy();
  });

  test('Enum list should only appear for strings and numbers, as well as arrays of those', () => {
    (Object.values(FieldType) as (FieldType | CombinationKind)[])
      .concat(Object.values(CombinationKind))
      .forEach((fieldType) => {
        const primitiveProps = { ...createNode({ fieldType }) };
        const arrayProps = {
          ...createNode({
            isArray: true,
            fieldType,
            objectKind: ObjectKind.Field,
            pointer: 'arraytest',
          }),
        };
        for (const props of [primitiveProps, arrayProps]) {
          const { renderResult } = renderItemRestrictions(props);
          switch (fieldType) {
            case FieldType.String:
            case FieldType.Number:
            case FieldType.Integer:
              expect(screen.getByText(legendText)).toBeDefined();
              break;
            default:
              expect(screen.queryByText(legendText)).toBeFalsy();
          }
          renderResult.unmount();
        }
      });
  });
});

const renderItemRestrictions = (props?: Partial<ItemRestrictionsProps>) =>
  renderWithRedux(<ItemRestrictions {...defaultProps} {...props} />);

const createNode = (props: Partial<UiSchemaNode>): UiSchemaNode => ({
  ...mockSelectedNode,
  ...props,
});
