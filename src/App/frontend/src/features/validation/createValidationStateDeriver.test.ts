import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { ExpressionObserver } from 'src/features/expressions/runtime/expressionObserver';
import { processLayouts } from 'src/features/form/layout/LayoutsContext';
import { makeLayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import { MissingRowIdException } from 'src/features/formData/MissingRowIdException';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { createValidationStateDeriver } from 'src/features/validation/createValidationStateDeriver';
import {
  getNodeRefValidations,
  getValidationDescendantIds,
  getValidationsForNode,
} from 'src/features/validation/deriveValidationState';
import { getComponentDef } from 'src/layout';
import type { ExpressionDataSources } from 'src/features/expressions/runtime/useExpressionDataSources';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { DataModelState } from 'src/features/formData/FormDataWriteStateMachine';
import type { DerivedValidationStateInputs } from 'src/features/validation/deriveValidationState';
import type { ILayoutCollection } from 'src/layout/layout';

function fixture(layout?: ILayoutCollection) {
  const layouts = layout ?? {
    Form: {
      data: {
        layout: [
          {
            id: 'input',
            type: 'Input',
            required: true,
            textResourceBindings: { title: 'Text' },
            dataModelBindings: { simpleBinding: { dataType: defaultDataTypeMock, field: 'TextField' } },
          },
        ],
      },
    },
  };
  const model: DataModelState = {
    currentData: { TextField: '' },
    debouncedCurrentData: { TextField: '' },
    invalidCurrentData: {},
    invalidDebouncedCurrentData: {},
    lastSavedData: { TextField: '' },
    dataElementId: 'data-id',
    validations: { backend: {}, schema: {}, invalidData: {} },
  };
  const state = {
    parent: undefined,
    nestedFormStatus: { unsaved: 0, unloadWarnings: 0 },
    readOnly: false,
    bootstrap: {
      layoutLookups: makeLayoutLookups(processLayouts(layouts, defaultDataTypeMock), layouts),
      dataModels: {},
    },
    data: { models: { [defaultDataTypeMock]: model }, autoSaving: true, debounceTimeout: 400 },
    validation: {
      formMask: ValidationMask.Required,
      pageMasks: {},
      rowMasks: {},
      otherDataElementBackendValidations: {},
    },
    attachments: { temporary: {}, failed: {} },
    layoutDiagnostics: {},
    pageNavigation: {},
  } as unknown as FormStoreState;
  const runtime = {
    markExpressionEvaluated: vi.fn(),
    track: vi.fn(),
    getDependencies: () => [],
    getSnapshotRevision: () => 0,
    collectDependencies: <T>(evaluate: () => T) => ({ value: evaluate(), dependencies: [] }),
    context: { assertDataSourceSupported: vi.fn() },
  } as unknown as ExpressionDataSources;
  const inputs: DerivedValidationStateInputs = {
    pageOrder: ['Form'],
    pdfLayoutName: undefined,
    hiddenDataSources: runtime,
    evalDataSources: runtime,
    instanceData: [],
    taskId: 'Task_1',
  };
  return { state, inputs, model };
}

function withModel(state: FormStoreState, changes: Partial<DataModelState>): FormStoreState {
  return {
    ...state,
    data: {
      ...state.data,
      models: {
        ...state.data.models,
        [defaultDataTypeMock]: { ...state.data.models[defaultDataTypeMock], ...changes },
      },
    },
  };
}

function descendantFixture(hidden = false) {
  const result = fixture({
    Form: {
      data: {
        layout: [
          {
            id: 'group',
            type: 'RepeatingGroup',
            children: ['child', 'nested'],
            hidden,
            minCount: 3,
            dataModelBindings: { group: { dataType: defaultDataTypeMock, field: 'Group' } },
          },
          {
            id: 'child',
            type: 'Input',
            required: true,
            dataModelBindings: { simpleBinding: { dataType: defaultDataTypeMock, field: 'Group.Value' } },
          },
          {
            id: 'nested',
            type: 'RepeatingGroup',
            children: ['nested-child'],
            dataModelBindings: { group: { dataType: defaultDataTypeMock, field: 'Group.Nested' } },
          },
          {
            id: 'nested-child',
            type: 'Input',
            required: true,
            dataModelBindings: { simpleBinding: { dataType: defaultDataTypeMock, field: 'Group.Nested.Value' } },
          },
          {
            id: 'unrelated',
            type: 'Input',
            required: true,
            dataModelBindings: { simpleBinding: { dataType: defaultDataTypeMock, field: 'Other' } },
          },
        ],
      },
    },
  });
  return {
    ...result,
    state: withModel(result.state, {
      debouncedCurrentData: {
        Group: [
          {
            [ALTINN_ROW_ID]: 'row-0',
            Value: '',
            Nested: [
              { [ALTINN_ROW_ID]: 'nested-0', Value: '' },
              { [ALTINN_ROW_ID]: 'nested-1', Value: '' },
            ],
          },
          { [ALTINN_ROW_ID]: 'row-1', Value: '', Nested: [{ [ALTINN_ROW_ID]: 'nested-2', Value: '' }] },
        ],
      },
    }),
  };
}

describe('descendant validation scope', () => {
  it.each([
    { nodeId: 'group', includeSelf: false, restriction: 0 },
    { nodeId: 'group', includeSelf: true, restriction: 0 },
    { nodeId: 'group', includeSelf: false, restriction: 1 },
    { nodeId: 'group', includeSelf: true },
    { nodeId: 'nested-0', includeSelf: false, restriction: 1 },
    { nodeId: 'missing', includeSelf: true },
  ])('preserves the full-page selection for scope %j', (scope) => {
    const { state, inputs } = descendantFixture();
    const complete = createValidationStateDeriver()(state, inputs);
    const expectedIds = [
      ...(scope.includeSelf ? [scope.nodeId] : []),
      ...getValidationDescendantIds(complete, scope.nodeId, scope.restriction),
    ];
    const selected = createValidationStateDeriver()(state, { ...inputs, descendantScope: scope });
    for (const mask of ['visible', 'showAll', ValidationMask.All] as const) {
      for (const severity of [undefined, 'error', 'warning'] as const) {
        expect(selected.nodes.flatMap((node) => getNodeRefValidations(selected, node.id, mask, severity))).toEqual(
          expectedIds.flatMap((id) => getNodeRefValidations(complete, id, mask, severity)),
        );
      }
    }
  });

  it('skips unrelated validators and preserves hidden ancestors without including the parent', () => {
    const { state, inputs } = descendantFixture(true);
    const validate = vi.spyOn(getComponentDef('Input'), 'validateEmptyField');
    const selected = createValidationStateDeriver()(state, {
      ...inputs,
      descendantScope: { nodeId: 'group', includeSelf: false, restriction: 0 },
    });
    expect(validate.mock.calls.map(([ctx]) => ctx.indexedId)).toEqual([
      'child-0',
      'nested-child-0-0',
      'nested-child-0-1',
    ]);
    expect(selected.nodes.every((node) => node.hidden)).toBe(true);
    expect(selected.nodes.flatMap((node) => getNodeRefValidations(selected, node.id, 'visible'))).toEqual([]);
    expect(
      selected.nodes.flatMap((node) => getNodeRefValidations(selected, node.id, 'visible', undefined, true)),
    ).toHaveLength(3);
  });

  it('keeps immediate edit cache hits without expanding runtime nodes and still replays dependencies', () => {
    const { state, inputs } = descendantFixture();
    const track = vi.fn();
    const dependency = { type: 'formData', reference: { dataType: defaultDataTypeMock, field: 'Other' } } as const;
    const runtime = {
      ...inputs.evalDataSources,
      track,
      collectDependencies: <T>(evaluate: () => T) => ({ value: evaluate(), dependencies: [dependency] }),
    };
    const scoped = {
      ...inputs,
      evalDataSources: runtime,
      descendantScope: { nodeId: 'group', includeSelf: false, restriction: 0 },
    };
    const derive = createValidationStateDeriver();
    const children = vi.spyOn(getComponentDef('RepeatingGroup'), 'getRuntimeChildren');
    const validate = vi.spyOn(getComponentDef('Input'), 'validateEmptyField');
    const snapshot = derive(state, scoped);
    const childCalls = children.mock.calls.length;
    const validationCalls = validate.mock.calls.length;
    for (let i = 0; i < 5; i++) {
      expect(
        derive(withModel(state, { currentData: { Other: String(i) } }), {
          ...scoped,
          descendantScope: { ...scoped.descendantScope },
        }),
      ).toBe(snapshot);
    }
    expect(children).toHaveBeenCalledTimes(childCalls);
    expect(validate).toHaveBeenCalledTimes(validationCalls);
    expect(track).toHaveBeenCalledWith(dependency);
    const updated = withModel(state, { debouncedCurrentData: { Group: [{ [ALTINN_ROW_ID]: 'new-row', Value: '' }] } });
    expect(derive(updated, scoped)).not.toBe(snapshot);
    expect(validate.mock.calls.slice(validationCalls).map(([ctx]) => ctx.indexedId)).toEqual(['child-0']);
  });

  it('invalidates each scope value and intersects explicit node IDs after descendant traversal', () => {
    const { state, inputs } = descendantFixture();
    const derive = createValidationStateDeriver();
    const scoped = { ...inputs, descendantScope: { nodeId: 'group', includeSelf: false, restriction: 0 } };
    const snapshot = derive(state, scoped);
    for (const descendantScope of [
      { ...scoped.descendantScope, nodeId: 'nested-0' },
      { ...scoped.descendantScope, includeSelf: true },
      { ...scoped.descendantScope, restriction: 1 },
      { nodeId: 'group', includeSelf: false },
    ]) {
      expect(derive(state, { ...scoped, descendantScope })).not.toBe(snapshot);
    }
    const selected = derive(state, { ...scoped, includedNodeIds: ['nested-child-0-1', 'child-1'] });
    expect(selected.nodes.map((node) => node.id)).toEqual(['nested-child-0-1']);
  });

  it('still rejects missing row IDs outside the requested row', () => {
    const { state, inputs } = descendantFixture();
    const updated = withModel(state, { debouncedCurrentData: { Group: [{ [ALTINN_ROW_ID]: 'valid' }, {}] } });
    expect(() =>
      createValidationStateDeriver()(updated, {
        ...inputs,
        descendantScope: { nodeId: 'group', includeSelf: false, restriction: 0 },
      }),
    ).toThrow(MissingRowIdException);
  });

  it('retains a selected child expression dependency outside its row and replays it on cache hits', () => {
    const { state, inputs } = descendantFixture();
    const child = state.bootstrap.layoutLookups.getComponent('child');
    if (child.type !== 'Input') {
      throw new Error('Expected the fixture child to be an Input');
    }
    child.required = ['equals', ['dataModel', 'Other'], 'yes'];
    let latest = withModel(state, {
      debouncedCurrentData: { ...state.data.models[defaultDataTypeMock].debouncedCurrentData, Other: 'yes' },
    });
    const observer = new ExpressionObserver(vi.fn(), (dependency) =>
      dependency.type === 'formData'
        ? (latest.data.models[defaultDataTypeMock].debouncedCurrentData as Record<string, unknown>)[
            dependency.reference.field
          ]
        : undefined,
    );
    const runtime = {
      ...inputs.evalDataSources,
      markExpressionEvaluated: () => observer.markEvaluated(),
      track: (dependency) => observer.track(dependency),
      collectDependencies: <T>(evaluate: () => T) => observer.collectDependencies(evaluate),
      formData: {
        defaultDataType: () => defaultDataTypeMock,
        hasDataType: () => true,
        read: (reference) => {
          observer.track({ type: 'formData', reference });
          return (latest.data.models[defaultDataTypeMock].debouncedCurrentData as Record<string, unknown>)[
            reference.field
          ];
        },
      },
    } satisfies ExpressionDataSources;
    const scoped = {
      ...inputs,
      evalDataSources: runtime,
      descendantScope: { nodeId: 'group', includeSelf: false, restriction: 0 },
    };
    const derive = createValidationStateDeriver();
    observer.beginCollect();
    const snapshot = derive(latest, scoped);
    observer.commitCollect();
    expect(getValidationsForNode(snapshot, 'child-0', 'visible')).toHaveLength(1);
    latest = withModel(latest, { currentData: { Other: 'typing' } });
    observer.beginCollect();
    expect(derive(latest, { ...scoped, descendantScope: { ...scoped.descendantScope } })).toBe(snapshot);
    observer.commitCollect();
    expect(observer.getDependencies()).toContainEqual({
      type: 'formData',
      reference: { dataType: defaultDataTypeMock, field: 'Other' },
    });
    latest = withModel(latest, {
      debouncedCurrentData: { ...latest.data.models[defaultDataTypeMock].debouncedCurrentData, Other: 'no' },
    });
    expect(getValidationsForNode(derive(latest, scoped), 'child-0', 'visible')).toEqual([]);
  });
});

describe('consumer validation snapshot cache', () => {
  afterEach(() => vi.restoreAllMocks());

  it('does not invoke the actual required validator during rapid valid typing, then validates the debounced value', () => {
    const { state, inputs } = fixture();
    const validate = vi.spyOn(getComponentDef('Input'), 'validateEmptyField');
    const derive = createValidationStateDeriver();
    const before = derive(state, inputs);
    expect(getValidationsForNode(before, 'input', 'visible')).toHaveLength(1);
    const calls = validate.mock.calls.length;
    let next = state;
    for (const TextField of ['s', 'so', 'som', 'some']) {
      next = withModel(next, { currentData: { TextField } });
      expect(derive(next, inputs)).toBe(before);
    }
    expect(validate).toHaveBeenCalledTimes(calls);
    next = withModel(next, { debouncedCurrentData: { TextField: 'some' } });
    const after = derive(next, inputs);
    expect(after).not.toBe(before);
    expect(getValidationsForNode(after, 'input', 'visible')).toEqual([]);
    expect(validate.mock.calls.length).toBeGreaterThan(calls);
  });

  it('uses invalid input immediately when the debounced binding is absent', () => {
    const { state, inputs } = fixture();
    const initial = withModel(state, { currentData: {}, debouncedCurrentData: {} });
    const derive = createValidationStateDeriver();
    expect(getValidationsForNode(derive(initial, inputs), 'input', 'visible')).toHaveLength(1);
    const invalid = withModel(initial, { invalidCurrentData: { TextField: '-' } });
    expect(getValidationsForNode(derive(invalid, inputs), 'input', 'visible')).toEqual([]);
  });

  it('updates backend, schema, and invalid-data field validations without a data edit', () => {
    const { state, inputs, model } = fixture();
    const initial = withModel(state, {
      currentData: { TextField: 'value' },
      debouncedCurrentData: { TextField: 'value' },
    });
    const derive = createValidationStateDeriver();
    expect(derive(initial, inputs).rawValidationsByNode.get('input')).toEqual([]);
    for (const key of ['backend', 'schema', 'invalidData'] as const) {
      const validation = {
        field: 'TextField',
        dataElementId: 'data-id',
        source: FrontendValidationSource.Schema,
        severity: 'error' as const,
        category: ValidationMask.Schema,
        message: { key },
      };
      const updated = withModel(initial, { validations: { ...model.validations, [key]: { TextField: [validation] } } });
      expect(derive(updated, inputs).rawValidationsByNode.get('input')).toEqual([
        expect.objectContaining({ message: { key } }),
      ]);
    }
  });

  it('updates visibility when form, page, or row masks change', () => {
    const { state, inputs } = fixture();
    const derive = createValidationStateDeriver();
    const hidden = { ...state, validation: { ...state.validation, formMask: 0 } };
    expect(getValidationsForNode(derive(hidden, inputs), 'input', 'visible')).toEqual([]);
    const shown = { ...hidden, validation: { ...hidden.validation, pageMasks: { Form: ValidationMask.Required } } };
    expect(getValidationsForNode(derive(shown, inputs), 'input', 'visible')).toHaveLength(1);
    const snapshot = derive(shown, inputs);
    expect(
      derive({ ...shown, validation: { ...shown.validation, rowMasks: { row: ValidationMask.Required } } }, inputs),
    ).not.toBe(snapshot);
  });

  it('regenerates repeating children after a debounced row is added and accepts newly loaded models', () => {
    const { state, inputs, model } = fixture({
      Form: {
        data: {
          layout: [
            {
              id: 'group',
              type: 'RepeatingGroup',
              children: ['child'],
              dataModelBindings: { group: { dataType: defaultDataTypeMock, field: 'Group' } },
            },
            {
              id: 'child',
              type: 'Input',
              required: true,
              dataModelBindings: { simpleBinding: { dataType: defaultDataTypeMock, field: 'Group.Value' } },
            },
          ],
        },
      },
    });
    const derive = createValidationStateDeriver();
    const initial = withModel(state, { debouncedCurrentData: { Group: [] } });
    expect(derive(initial, inputs).nodes.map((node) => node.id)).toEqual(['group']);
    const added = withModel(initial, { debouncedCurrentData: { Group: [{ [ALTINN_ROW_ID]: 'row', Value: '' }] } });
    const snapshot = derive(added, inputs);
    expect(snapshot.nodes.map((node) => node.id)).toEqual(['group', 'child-0']);
    expect(getValidationsForNode(snapshot, 'child-0', 'visible')).toHaveLength(1);
    const newModel = { ...added, data: { ...added.data, models: { ...added.data.models, newModel: model } } };
    expect(derive(newModel, inputs)).not.toBe(snapshot);
  });

  it('preserves expression dependencies separately for each consumer', () => {
    const { state, inputs } = fixture();
    const validate = vi.spyOn(getComponentDef('Input'), 'validateEmptyField');
    const first = createValidationStateDeriver();
    const second = createValidationStateDeriver();
    const snapshot = first(state, inputs);
    const calls = validate.mock.calls.length;
    expect(second(state, inputs)).not.toBe(snapshot);
    expect(validate.mock.calls.length).toBeGreaterThan(calls);
    const next = withModel(state, { currentData: { TextField: 'typed' } });
    expect(first(next, inputs)).toBe(snapshot);
  });

  it('invalidates on query-backed runtime updates and page/node scopes while reusing equivalent scope arrays', () => {
    const { state, inputs } = fixture();
    const derive = createValidationStateDeriver();
    const scoped = { ...inputs, includedPageKeys: ['Form'], includedNodeIds: ['input'] };
    const snapshot = derive(state, scoped);
    expect(derive(state, { ...scoped, includedPageKeys: new Set(['Form']), includedNodeIds: ['input'] })).toBe(
      snapshot,
    );
    expect(derive(state, { ...scoped, evalDataSources: { ...inputs.evalDataSources } })).not.toBe(snapshot);
    expect(derive(state, { ...scoped, includedNodeIds: [] }).nodes).toEqual([]);
    expect(derive(state, { ...scoped, includedPageKeys: ['Other'] }).nodes).toEqual([]);
  });

  it('checks language, page, and application settings before observer runtime identity changes', () => {
    const { state, inputs } = fixture();
    const derive = createValidationStateDeriver();
    const settings = {};
    const snapshot = derive(state, inputs, ['nb', 'Form', settings]);
    expect(derive(state, inputs, ['nb', 'Form', settings])).toBe(snapshot);
    for (const context of [
      ['nn', 'Form', settings],
      ['nb', 'Other', settings],
      ['nb', 'Form', {}],
    ]) {
      expect(derive(state, inputs, context)).not.toBe(snapshot);
    }
  });

  it('retains the consumer query dependency on cache hits and rebuilds after an actual query notification', async () => {
    const { state, inputs } = fixture({
      Form: {
        data: {
          layout: [
            {
              id: 'input',
              type: 'Input',
              required: ['equals', ['externalApi', 'requirements', 'required'], 'yes'],
              dataModelBindings: { simpleBinding: { dataType: defaultDataTypeMock, field: 'TextField' } },
            },
          ],
        },
      },
    });
    let queryState = { required: 'yes' };
    let queryCallback: (() => void) | undefined;
    const changed = vi.fn();
    const observer = new ExpressionObserver(changed, () => queryState);
    const runtime = {
      ...inputs.evalDataSources,
      markExpressionEvaluated: () => observer.markEvaluated(),
      track: (dependency) => observer.track(dependency),
      getDependencies: () => observer.getDependencies(),
      collectDependencies: <T>(evaluate: () => T) => observer.collectDependencies(evaluate),
      externalApi: {
        getAll: () => {
          observer.track({ type: 'externalApi', externalApiId: 'requirements' });
          return { data: { requirements: queryState }, errors: {} };
        },
      },
    };
    const unsubscribe = observer.subscribe({
      owner: 'storeSelector',
      subscribeStore: undefined,
      subscribeQuery: (callback) => {
        queryCallback = callback;
        return () => {
          queryCallback = undefined;
        };
      },
    });
    const derive = createValidationStateDeriver();
    observer.beginCollect();
    const first = derive(state, { ...inputs, evalDataSources: runtime });
    observer.commitCollect();
    expect(getValidationsForNode(first, 'input', 'visible')).toHaveLength(1);
    expect(observer.getDependencies()).toEqual([{ type: 'externalApi', externalApiId: 'requirements' }]);
    observer.beginCollect();
    expect(
      derive(withModel(state, { currentData: { TextField: 'typed' } }), { ...inputs, evalDataSources: runtime }),
    ).toBe(first);
    observer.commitCollect();
    expect(observer.getDependencies()).toHaveLength(1);
    queryState = { required: 'no' };
    queryCallback?.();
    await Promise.resolve();
    expect(changed).toHaveBeenCalledTimes(1);
    // The runtime hook publishes a new identity after this observer notification.
    observer.beginCollect();
    const next = derive(state, { ...inputs, evalDataSources: { ...runtime } });
    observer.commitCollect();
    expect(getValidationsForNode(next, 'input', 'visible')).toEqual([]);
    unsubscribe();
  });

  it('replays dependencies after an initial speculative render resets collection before committing', () => {
    const { state, inputs } = fixture({
      Form: {
        data: {
          layout: [
            {
              id: 'input',
              type: 'Input',
              required: ['equals', ['language'], 'nb'],
              dataModelBindings: { simpleBinding: { dataType: defaultDataTypeMock, field: 'TextField' } },
            },
          ],
        },
      },
    });
    const observer = new ExpressionObserver(vi.fn(), () => 'nb');
    const runtime = {
      ...inputs.evalDataSources,
      markExpressionEvaluated: () => observer.markEvaluated(),
      track: (dependency) => observer.track(dependency),
      getDependencies: () => observer.getDependencies(),
      collectDependencies: <T>(evaluate: () => T) => observer.collectDependencies(evaluate),
      context: {
        ...inputs.evalDataSources.context,
        currentLanguage: () => {
          observer.track({ type: 'currentLanguage' });
          return 'nb';
        },
      },
    } satisfies ExpressionDataSources;
    const derive = createValidationStateDeriver();
    const withRuntime = { ...inputs, evalDataSources: runtime };
    observer.beginCollect();
    const first = derive(state, withRuntime);
    // StrictMode or an interrupted initial render starts collection again.
    observer.beginCollect();
    expect(derive(state, withRuntime)).toBe(first);
    observer.commitCollect();
    expect(observer.getDependencies()).toEqual([{ type: 'currentLanguage' }]);
  });

  it('replays exactly newly evaluated dependencies after deriving a changed layout before render', () => {
    const layout = (field: string): ILayoutCollection => ({
      Form: {
        data: {
          layout: [
            {
              id: 'input',
              type: 'Input',
              required: ['equals', ['dataModel', field], 'yes'],
              dataModelBindings: { simpleBinding: { dataType: defaultDataTypeMock, field: 'TextField' } },
            },
          ],
        },
      },
    });
    const { state, inputs } = fixture(layout('FieldA'));
    let latest = withModel(state, { debouncedCurrentData: { Kind: 'A', FieldA: 'yes', FieldB: 'yes', TextField: '' } });
    const observer = new ExpressionObserver(vi.fn(), (dependency) =>
      dependency.type === 'formData'
        ? (latest.data.models[defaultDataTypeMock].debouncedCurrentData as Record<string, unknown>)[
            dependency.reference.field
          ]
        : undefined,
    );
    const runtime = {
      ...inputs.evalDataSources,
      markExpressionEvaluated: () => observer.markEvaluated(),
      track: (dependency) => observer.track(dependency),
      getDependencies: () => observer.getDependencies(),
      collectDependencies: <T>(evaluate: () => T) => observer.collectDependencies(evaluate),
      formData: {
        defaultDataType: () => defaultDataTypeMock,
        hasDataType: () => true,
        read: (reference) => {
          observer.track({ type: 'formData', reference });
          return (latest.data.models[defaultDataTypeMock].debouncedCurrentData as Record<string, unknown>)[
            reference.field
          ];
        },
      },
    } satisfies ExpressionDataSources;
    const derive = createValidationStateDeriver();
    const withRuntime = { ...inputs, evalDataSources: runtime };
    observer.beginCollect();
    derive(latest, withRuntime);
    observer.commitCollect();
    expect(observer.getDependencies().map((dep) => (dep.type === 'formData' ? dep.reference.field : dep.type))).toEqual(
      ['FieldA'],
    );
    latest = { ...latest, bootstrap: fixture(layout('FieldB')).state.bootstrap };
    const beforeRender = derive(latest, withRuntime);
    observer.beginCollect();
    expect(derive(latest, withRuntime)).toBe(beforeRender);
    observer.commitCollect();
    expect(observer.getDependencies().map((dep) => (dep.type === 'formData' ? dep.reference.field : dep.type))).toEqual(
      ['FieldB'],
    );
  });

  it('invalidates stable runtimes when a changed snapshot input advances their revision', () => {
    const { state, inputs } = fixture({
      Form: {
        data: {
          layout: [
            {
              id: 'input',
              type: 'Input',
              required: ['equals', ['language'], 'nb'],
              dataModelBindings: { simpleBinding: { dataType: defaultDataTypeMock, field: 'TextField' } },
            },
          ],
        },
      },
    });
    let language = 'nb';
    let revision = 0;
    inputs.evalDataSources.context.currentLanguage = () => language;
    inputs.evalDataSources.getSnapshotRevision = () => revision;
    const derive = createValidationStateDeriver();
    expect(getValidationsForNode(derive(state, inputs), 'input', 'visible')).toHaveLength(1);
    language = 'nn';
    revision++;
    expect(getValidationsForNode(derive(state, inputs), 'input', 'visible')).toEqual([]);
  });

  it('rebuilds conservatively for custom runtimes without the snapshot-revision contract', () => {
    const { state, inputs } = fixture({
      Form: {
        data: {
          layout: [
            {
              id: 'input',
              type: 'Input',
              required: ['equals', ['language'], 'nb'],
              dataModelBindings: { simpleBinding: { dataType: defaultDataTypeMock, field: 'TextField' } },
            },
          ],
        },
      },
    });
    let language = 'nb';
    inputs.evalDataSources.context.currentLanguage = () => language;
    delete inputs.evalDataSources.getSnapshotRevision;
    const derive = createValidationStateDeriver();
    expect(getValidationsForNode(derive(state, inputs), 'input', 'visible')).toHaveLength(1);
    language = 'nn';
    expect(getValidationsForNode(derive(state, inputs), 'input', 'visible')).toEqual([]);
  });

  it('re-evaluates a language-dependent required expression on the first changed context', () => {
    const { state, inputs } = fixture({
      Form: {
        data: {
          layout: [
            {
              id: 'input',
              type: 'Input',
              required: ['equals', ['language'], 'nb'],
              dataModelBindings: { simpleBinding: { dataType: defaultDataTypeMock, field: 'TextField' } },
            },
          ],
        },
      },
    });
    let language = 'nb';
    inputs.evalDataSources.context.currentLanguage = () => language;
    const derive = createValidationStateDeriver();
    expect(getValidationsForNode(derive(state, inputs, [language]), 'input', 'visible')).toHaveLength(1);
    language = 'nn';
    expect(getValidationsForNode(derive(state, inputs, [language]), 'input', 'visible')).toEqual([]);
  });

  it('re-evaluates a page-dependent required message on the first changed context', () => {
    const { state, inputs } = fixture({
      Form: {
        data: {
          layout: [
            {
              id: 'input',
              type: 'Input',
              required: true,
              textResourceBindings: { title: ['linkToPage', 'Help', 'Other', true] },
              dataModelBindings: { simpleBinding: { dataType: defaultDataTypeMock, field: 'TextField' } },
            },
          ],
        },
      },
    });
    let page = 'Form';
    inputs.evalDataSources.context.currentPage = () => page;
    inputs.evalDataSources.instance = {
      getDataSources: () => null,
      getProcess: () => undefined,
      countDataElements: () => 0,
    };
    const derive = createValidationStateDeriver();
    const first = getValidationsForNode(derive(state, inputs, [page]), 'input', 'visible');
    expect(first[0].message.params).toEqual([
      expect.objectContaining({ key: expect.stringContaining('backToPage=Form') }),
    ]);
    page = 'Next';
    const second = getValidationsForNode(derive(state, inputs, [page]), 'input', 'visible');
    expect(second[0].message.params).toEqual([
      expect.objectContaining({ key: expect.stringContaining('backToPage=Next') }),
    ]);
  });

  it('re-evaluates a settings-dependent required expression without a form-data change', () => {
    const { state, inputs } = fixture({
      Form: {
        data: {
          layout: [
            {
              id: 'input',
              type: 'Input',
              required: ['equals', ['frontendSettings', 'required'], 'yes'],
              dataModelBindings: { simpleBinding: { dataType: defaultDataTypeMock, field: 'TextField' } },
            },
          ],
        },
      },
    });
    let settings = { required: 'yes' };
    inputs.evalDataSources.application = { getSettings: () => settings };
    const derive = createValidationStateDeriver();
    expect(getValidationsForNode(derive(state, inputs, [settings]), 'input', 'visible')).toHaveLength(1);
    settings = { required: 'no' };
    expect(getValidationsForNode(derive(state, inputs, [settings]), 'input', 'visible')).toEqual([]);
  });

  it('invalidates when the navigation context changes instance, task, subform component, or data element', () => {
    const { state, inputs } = fixture();
    const derive = createValidationStateDeriver();
    const navigation = {
      instanceOwnerPartyId: 'owner',
      instanceGuid: 'instance',
      taskId: 'Task_1',
      pageKey: 'Form',
      componentId: 'subform',
      dataElementId: 'element',
    };
    const first = derive(state, inputs, [navigation]);
    expect(derive(state, inputs, [navigation])).toBe(first);
    for (const changes of [
      { instanceGuid: 'new' },
      { taskId: 'Task_2' },
      { componentId: 'other' },
      { dataElementId: 'new-element' },
    ]) {
      expect(derive(state, inputs, [{ ...navigation, ...changes }])).not.toBe(first);
    }
  });

  it('updates actual minimum attachment validation after the instance query supplies an uploaded file', () => {
    const { state, inputs } = fixture({
      Form: {
        data: {
          layout: [
            {
              id: 'test-data-type-1',
              type: 'FileUpload',
              minNumberOfAttachments: 1,
              maxNumberOfAttachments: 5,
              maxFileSizeInMB: 25,
              displayMode: 'list',
            },
          ],
        },
      },
    });
    const derive = createValidationStateDeriver();
    expect(getValidationsForNode(derive(state, inputs), 'test-data-type-1', 'visible')).toHaveLength(1);
    const instanceData = [
      { ...getInstanceDataMock().data[0], id: 'file-id', dataType: 'test-data-type-1', filename: 'test.pdf' },
    ];
    const snapshot = derive(state, { ...inputs, instanceData });
    expect(getValidationsForNode(snapshot, 'test-data-type-1', 'visible')).toEqual([]);
    expect(
      derive(
        { ...state, attachments: { ...state.attachments, temporary: { 'test-data-type-1': {} } } },
        { ...inputs, instanceData },
      ),
    ).not.toBe(snapshot);
  });

  it('invalidates on bootstrap, model identity, save state, and any newly introduced non-current data field', () => {
    const { state, inputs, model } = fixture();
    const derive = createValidationStateDeriver();
    const snapshot = derive(state, inputs);
    const changes = [
      { ...state, bootstrap: { ...state.bootstrap } },
      withModel(state, { dataElementId: 'replacement-id' }),
      withModel(state, { lastSavedData: { ...model.lastSavedData } }),
      withModel(state, { invalidDebouncedCurrentData: { TextField: '-' } }),
      { ...state, data: { ...state.data, manualSaveRequested: true } },
    ];
    for (const changed of changes) {
      expect(derive(changed, inputs)).not.toBe(snapshot);
    }
  });
});
