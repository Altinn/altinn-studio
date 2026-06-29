import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { processLayouts } from 'src/features/form/layout/LayoutsContext';
import { makeLayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import { MissingRowIdException } from 'src/features/formData/MissingRowIdException';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { deriveNodes } from 'src/features/validation/deriveNodes';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { ILayoutCollection } from 'src/layout/layout';
import type { ExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';

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
});
