import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { processLayouts } from 'src/features/form/layout/LayoutsContext';
import { makeLayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import { MissingRowIdException } from 'src/features/formData/MissingRowIdException';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { deriveNodes } from 'src/features/validation/deriveNodes';
import { deriveLayoutNodes } from 'src/utils/layout/deriveLayoutNodes';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { ILayoutCollection } from 'src/layout/layout';
import type { ExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';

describe('deriveNodes', () => {
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

  it('can derive repeating nodes from current rows while keeping debounced rows as default', () => {
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
    const layouts = processLayouts(layoutCollection, defaultDataTypeMock);
    const state = {
      bootstrap: {
        layoutLookups: makeLayoutLookups(layouts, layoutCollection),
      },
      data: {
        models: {
          [defaultDataTypeMock]: {
            currentData: {
              Group: [
                { [ALTINN_ROW_ID]: 'current-0', Value: 'first' },
                { [ALTINN_ROW_ID]: 'current-1', Value: 'second' },
              ],
            },
            debouncedCurrentData: {
              Group: [{ [ALTINN_ROW_ID]: 'debounced-0', Value: 'first' }],
            },
          },
        },
      },
    } as unknown as FormStoreState;

    const debouncedInputNodes = deriveLayoutNodes(state).filter((node) => node.baseId === 'input');
    const currentInputNodes = deriveLayoutNodes(state, { rowSource: 'current' }).filter(
      (node) => node.baseId === 'input',
    );

    expect(debouncedInputNodes).toHaveLength(1);
    expect(currentInputNodes).toHaveLength(2);
    expect(currentInputNodes[1]).toMatchObject({
      id: 'input-1',
      parent: { type: 'node', id: 'group', baseId: 'group' },
      rowIds: ['current-1'],
      intermediateItem: {
        dataModelBindings: {
          simpleBinding: { dataType: defaultDataTypeMock, field: 'Group[1].Value' },
        },
      },
    });
  });
});
