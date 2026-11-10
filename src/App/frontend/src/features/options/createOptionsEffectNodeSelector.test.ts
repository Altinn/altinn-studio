import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { processLayouts } from 'src/features/form/layout/LayoutsContext';
import { makeLayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import { MissingRowIdException } from 'src/features/formData/MissingRowIdException';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { createOptionsEffectNodeSelector } from 'src/features/options/createOptionsEffectNodeSelector';
import { getComponentDef } from 'src/layout';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { ILayoutCollection } from 'src/layout/layout';

function groupLayout(): ILayoutCollection {
  return {
    Form: {
      data: {
        layout: [
          {
            id: 'group',
            type: 'RepeatingGroup',
            children: ['choice'],
            dataModelBindings: { group: { dataType: defaultDataTypeMock, field: 'Group' } },
          },
          {
            id: 'choice',
            type: 'RadioButtons',
            dataModelBindings: { simpleBinding: { dataType: defaultDataTypeMock, field: 'Group.Value' } },
            options: [{ label: 'One', value: 'one' }],
          },
        ],
      },
    },
  };
}

function fixture(layout: ILayoutCollection = groupLayout()): FormStoreState {
  return {
    bootstrap: { layoutLookups: makeLayoutLookups(processLayouts(layout, defaultDataTypeMock), layout) },
    data: {
      models: {
        [defaultDataTypeMock]: {
          currentData: {},
          debouncedCurrentData: {
            Group: [
              { [ALTINN_ROW_ID]: 'first', Value: 'one' },
              { [ALTINN_ROW_ID]: 'second', Value: '' },
            ],
          },
        },
      },
    },
  } as unknown as FormStoreState;
}

function withDebounced(state: FormStoreState, data: object): FormStoreState {
  return {
    ...state,
    data: {
      ...state.data,
      models: {
        ...state.data.models,
        [defaultDataTypeMock]: { ...state.data.models[defaultDataTypeMock], debouncedCurrentData: data },
      },
    },
  };
}

describe('private options node discovery', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reuses its selected nodes and skips traversal for repeated immediate currentData-only edits', () => {
    const state = fixture();
    const traversal = vi.spyOn(getComponentDef('RepeatingGroup'), 'getRuntimeChildren');
    const select = createOptionsEffectNodeSelector();
    const first = select(state);
    expect(first.map(({ node }) => node.id)).toEqual(['choice-0', 'choice-1']);
    const calls = traversal.mock.calls.length;
    for (const Value of ['a', 'ab', 'abc']) {
      const next = {
        ...state,
        data: {
          ...state.data,
          models: {
            ...state.data.models,
            [defaultDataTypeMock]: { ...state.data.models[defaultDataTypeMock], currentData: { Value } },
          },
        },
      };
      expect(select(next)).toBe(first);
    }
    expect(traversal).toHaveBeenCalledTimes(calls);
  });

  it('rebuilds after debounced row addition, reordering and removal', () => {
    const state = fixture();
    const select = createOptionsEffectNodeSelector();
    const first = select(state);
    const added = withDebounced(state, {
      Group: [{ [ALTINN_ROW_ID]: 'first' }, { [ALTINN_ROW_ID]: 'second' }, { [ALTINN_ROW_ID]: 'third' }],
    });
    const afterAddition = select(added);
    expect(afterAddition.map(({ node }) => node.rowIds)).toEqual([['first'], ['second'], ['third']]);
    expect(afterAddition[0]).toBe(first[0]);
    expect(afterAddition[1]).toBe(first[1]);
    const reordered = withDebounced(added, { Group: [{ [ALTINN_ROW_ID]: 'third' }, { [ALTINN_ROW_ID]: 'first' }] });
    const result = select(reordered);
    expect(result).not.toBe(first);
    expect(result[0]).not.toBe(afterAddition[0]);
    expect(result[1]).not.toBe(afterAddition[1]);
    expect(result.map(({ node }) => [node.id, node.rowIds])).toEqual([
      ['choice-0', ['third']],
      ['choice-1', ['first']],
    ]);
  });

  it('keeps effect locations stable when only values in existing rows change', () => {
    const state = fixture();
    const select = createOptionsEffectNodeSelector();
    const first = select(state);
    const edited = withDebounced(state, {
      Group: [
        { [ALTINN_ROW_ID]: 'first', Value: 'two' },
        { [ALTINN_ROW_ID]: 'second', Value: 'one' },
      ],
    });
    expect(select(edited)).toBe(first);
  });

  it('keeps malformed-row errors visible after an earlier valid snapshot', () => {
    const state = fixture();
    const select = createOptionsEffectNodeSelector();
    const first = select(state);
    expect(() => select(withDebounced(state, { Group: [{}] }))).toThrow(new MissingRowIdException('Group[0]'));
    expect(select(state)).toBe(first);
    expect(select(withDebounced(state, { Group: undefined }))).toEqual([]);
  });

  it('rebuilds on layout replacement even with unchanged model roots', () => {
    const state = fixture();
    const select = createOptionsEffectNodeSelector();
    const first = select(state);
    const layout = groupLayout();
    layout.Form.data.layout[1].id = 'replacement';
    const group = layout.Form.data.layout[0];
    if (group.type !== 'RepeatingGroup') {
      throw new Error('Expected group');
    }
    group.children = ['replacement'];
    const next = {
      ...state,
      bootstrap: {
        ...state.bootstrap,
        layoutLookups: makeLayoutLookups(processLayouts(layout, defaultDataTypeMock), layout),
      },
    };
    expect(select(next)).not.toBe(first);
    expect(select(next).map(({ node }) => node.id)).toEqual(['replacement-0', 'replacement-1']);
  });

  it('rebuilds Likert children for debounced rows and static filter replacement', () => {
    const layout: ILayoutCollection = {
      Form: {
        data: {
          layout: [
            {
              id: 'likert',
              type: 'Likert',
              dataModelBindings: {
                questions: { dataType: defaultDataTypeMock, field: 'Group' },
                answer: { dataType: defaultDataTypeMock, field: 'Group.Value' },
              },
              options: [{ label: 'One', value: 'one' }],
              filter: [{ key: 'start', value: '1' }],
            },
          ],
        },
      },
    };
    const state = fixture(layout);
    const select = createOptionsEffectNodeSelector();
    const first = select(state);
    expect(first.filter(({ node }) => node.rowIds.length).map(({ node }) => node.rowIds)).toEqual([['second']]);
    const added = withDebounced(state, {
      Group: [{ [ALTINN_ROW_ID]: 'first' }, { [ALTINN_ROW_ID]: 'second' }, { [ALTINN_ROW_ID]: 'third' }],
    });
    expect(
      select(added)
        .filter(({ node }) => node.rowIds.length)
        .map(({ node }) => node.rowIds),
    ).toEqual([['second'], ['third']]);
    const item = layout.Form.data.layout[0];
    if (item.type !== 'Likert') {
      throw new Error('Expected Likert');
    }
    item.filter = [{ key: 'stop', value: '1' }];
    const changed = {
      ...state,
      bootstrap: {
        ...state.bootstrap,
        layoutLookups: makeLayoutLookups(processLayouts(layout, defaultDataTypeMock), layout),
      },
    };
    expect(
      select(changed)
        .filter(({ node }) => node.rowIds.length)
        .map(({ node }) => node.rowIds),
    ).toEqual([['first']]);
  });

  it('rebuilds when referenced model data loads and holds results separately per consumer', () => {
    const state = fixture();
    const first = createOptionsEffectNodeSelector();
    const second = createOptionsEffectNodeSelector();
    expect(first(state)).not.toBe(second(state));
    const unloaded = { ...state, data: { ...state.data, models: {} } };
    expect(first(unloaded)).toEqual([]);
    expect(first(state).map(({ node }) => node.rowIds)).toEqual([['first'], ['second']]);
  });
});
