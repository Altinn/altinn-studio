import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { processLayouts } from 'src/features/form/layout/LayoutsContext';
import { makeLayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import { MissingRowIdException } from 'src/features/formData/MissingRowIdException';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { deriveNodes } from 'src/features/validation/deriveNodes';
import { deriveRuntimeNodeRefs } from 'src/utils/layout/deriveRuntimeNodeRefs';
import { getRuntimeIntermediateItem } from 'src/utils/layout/rowContext';
import type { ExpressionDataSources } from 'src/features/expressions/runtime/useExpressionDataSources';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { ILayoutCollection } from 'src/layout/layout';

describe('deriveNodes', () => {
  it('can derive only the requested generated node', () => {
    const layoutCollection = {
      Form: {
        data: {
          layout: [
            {
              id: 'group',
              type: 'RepeatingGroup',
              children: ['input'],
              dataModelBindings: {
                group: { dataType: defaultDataTypeMock, field: 'Group' },
              },
            },
            {
              id: 'input',
              type: 'Input',
              dataModelBindings: {
                simpleBinding: { dataType: defaultDataTypeMock, field: 'Group.Value' },
              },
            },
            {
              id: 'unrelated',
              type: 'Input',
              dataModelBindings: {
                simpleBinding: { dataType: defaultDataTypeMock, field: 'Unrelated' },
              },
            },
          ],
        },
      },
    } satisfies ILayoutCollection;
    const layouts = processLayouts(layoutCollection, defaultDataTypeMock);
    const state = {
      bootstrap: {
        layoutLookups: makeLayoutLookups(layouts, layoutCollection),
      },
      data: {
        models: {
          [defaultDataTypeMock]: {
            debouncedCurrentData: {
              Group: [
                { [ALTINN_ROW_ID]: 'row-0', Value: 'first' },
                { [ALTINN_ROW_ID]: 'row-1', Value: 'second' },
              ],
            },
          },
        },
      },
    } as unknown as FormStoreState;

    const nodes = deriveNodes(state, {
      pageOrder: ['Form'],
      includedNodeIds: ['input-1'],
      pdfLayoutName: undefined,
      hiddenDataSources: {} as ExpressionDataSources,
    });

    expect(nodes.map((node) => node.id)).toEqual(['input-1']);
  });

  it('throws when a repeating row is missing its row ID', () => {
    const layoutCollection = {
      Form: {
        data: {
          layout: [
            {
              id: 'group',
              type: 'RepeatingGroup',
              children: ['input'],
              dataModelBindings: {
                group: { dataType: defaultDataTypeMock, field: 'Group' },
              },
            },
            {
              id: 'input',
              type: 'Input',
              dataModelBindings: {
                simpleBinding: { dataType: defaultDataTypeMock, field: 'Group.Value' },
              },
            },
          ],
        },
      },
    } satisfies ILayoutCollection;
    const { processedLayouts: layouts } = processLayouts(layoutCollection, defaultDataTypeMock);
    const state = {
      bootstrap: {
        layoutLookups: makeLayoutLookups(layouts, layoutCollection),
      },
      data: {
        models: {
          [defaultDataTypeMock]: {
            debouncedCurrentData: {
              Group: [{}],
            },
          },
        },
      },
    } as unknown as FormStoreState;

    expect(() =>
      deriveNodes(state, {
        pageOrder: ['Form'],
        pdfLayoutName: undefined,
        hiddenDataSources: {} as ExpressionDataSources,
      }),
    ).toThrow(new MissingRowIdException('Group[0]'));
  });

  it('only transposes child bindings that are descendants of the repeating group binding', () => {
    const layoutCollection = {
      Form: {
        data: {
          layout: [
            {
              id: 'group',
              type: 'RepeatingGroup',
              children: ['inside-group', 'same-prefix'],
              dataModelBindings: {
                group: { dataType: defaultDataTypeMock, field: 'person' },
              },
            },
            {
              id: 'inside-group',
              type: 'Input',
              dataModelBindings: {
                simpleBinding: { dataType: defaultDataTypeMock, field: 'person.name' },
              },
            },
            {
              id: 'same-prefix',
              type: 'Input',
              dataModelBindings: {
                simpleBinding: { dataType: defaultDataTypeMock, field: 'personName' },
              },
            },
          ],
        },
      },
    } satisfies ILayoutCollection;
    const layouts = processLayouts(layoutCollection, defaultDataTypeMock);
    const state = {
      bootstrap: {
        layoutLookups: makeLayoutLookups(layouts, layoutCollection),
      },
      data: {
        models: {
          [defaultDataTypeMock]: {
            debouncedCurrentData: {
              person: [{ [ALTINN_ROW_ID]: 'row-0', name: 'Ada' }],
            },
          },
        },
      },
    } as unknown as FormStoreState;

    const nodes = deriveRuntimeNodeRefs(state);
    const insideGroupNode = nodes.find((node) => node.id === 'inside-group-0');
    const samePrefixNode = nodes.find((node) => node.id === 'same-prefix-0');
    const insideGroup =
      insideGroupNode &&
      getRuntimeIntermediateItem(
        state.bootstrap.layoutLookups.getComponent(insideGroupNode.baseId),
        insideGroupNode.rowContexts,
      );
    const samePrefix =
      samePrefixNode &&
      getRuntimeIntermediateItem(
        state.bootstrap.layoutLookups.getComponent(samePrefixNode.baseId),
        samePrefixNode.rowContexts,
      );

    if (insideGroup?.type !== 'Input' || samePrefix?.type !== 'Input') {
      throw new Error('Expected derived nodes to be Input components');
    }

    expect(insideGroup.dataModelBindings.simpleBinding.field).toBe('person[0].name');
    expect(samePrefix.dataModelBindings.simpleBinding.field).toBe('personName');
  });

  it('transposes nested repeating group bindings from row contexts', () => {
    const layoutCollection = {
      Form: {
        data: {
          layout: [
            {
              id: 'people',
              type: 'RepeatingGroup',
              children: ['addresses'],
              dataModelBindings: {
                group: { dataType: defaultDataTypeMock, field: 'people' },
              },
            },
            {
              id: 'addresses',
              type: 'RepeatingGroup',
              children: ['street'],
              dataModelBindings: {
                group: { dataType: defaultDataTypeMock, field: 'people.addresses' },
              },
            },
            {
              id: 'street',
              type: 'Input',
              dataModelBindings: {
                simpleBinding: { dataType: defaultDataTypeMock, field: 'people.addresses.street' },
              },
            },
          ],
        },
      },
    } satisfies ILayoutCollection;
    const layouts = processLayouts(layoutCollection, defaultDataTypeMock);
    const state = {
      bootstrap: {
        layoutLookups: makeLayoutLookups(layouts, layoutCollection),
      },
      data: {
        models: {
          [defaultDataTypeMock]: {
            debouncedCurrentData: {
              people: [
                {
                  [ALTINN_ROW_ID]: 'person-0',
                  addresses: [{ [ALTINN_ROW_ID]: 'address-0', street: 'Main street' }],
                },
              ],
            },
          },
        },
      },
    } as unknown as FormStoreState;

    const nodes = deriveRuntimeNodeRefs(state);
    const addressesNode = nodes.find((node) => node.id === 'addresses-0');
    const streetNode = nodes.find((node) => node.id === 'street-0-0');
    const addresses =
      addressesNode &&
      getRuntimeIntermediateItem(
        state.bootstrap.layoutLookups.getComponent(addressesNode.baseId),
        addressesNode.rowContexts,
      );
    const street =
      streetNode &&
      getRuntimeIntermediateItem(state.bootstrap.layoutLookups.getComponent(streetNode.baseId), streetNode.rowContexts);

    if (addresses?.type !== 'RepeatingGroup' || street?.type !== 'Input') {
      throw new Error('Expected nested repeating group and input nodes');
    }

    expect(addresses.dataModelBindings.group.field).toBe('people[0].addresses');
    expect(street.dataModelBindings.simpleBinding.field).toBe('people[0].addresses[0].street');
  });
});
