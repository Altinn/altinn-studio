import React from 'react';
import { Provider } from 'react-redux';

import { getInitialStateMock } from '__mocks__/initialStateMock';
import { act, renderHook } from '@testing-library/react';
import type { MockInstance } from 'jest-mock';

import { useExpressions } from 'src/features/expressions/useExpressions';
import { FormDataActions } from 'src/features/form/data/formDataSlice';
import { setupStore } from 'src/store';
import type { ExpressionOr } from 'src/features/expressions/types';
import type { UseExpressionsOptions } from 'src/features/expressions/useExpressions';
import type { IFormData } from 'src/features/form/data';
import type { ILayout, ILayoutComponent, ILayoutGroup } from 'src/features/form/layout';
import type { IRuntimeState } from 'src/types';

interface ExampleThingWithExpressions {
  notAnExpr: boolean;
  hidden: ExpressionOr<'boolean'>;
  innerObject: {
    label: string;
    readOnly: ExpressionOr<'boolean'>;
  };
}

const components = {
  topLayer: {
    id: 'topLayer',
    type: 'Input',
    dataModelBindings: { simpleBinding: 'Model.TopLayer' },
  } as ILayoutComponent,
  group: {
    id: 'group',
    type: 'Group',
    maxCount: 5,
    children: ['inGroup1', 'inGroup2', 'nestedGroup'],
    dataModelBindings: { group: 'Model.Group' },
  } as ILayoutGroup,
  inGroup1: {
    id: 'inGroup1',
    type: 'Input',
    dataModelBindings: { simpleBinding: 'Model.Group.Field1' },
  } as ILayoutComponent,
  inGroup2: {
    id: 'inGroup2',
    type: 'Input',
    dataModelBindings: { simpleBinding: 'Model.Group.Field2' },
  } as ILayoutComponent,
  nestedGroup: {
    id: 'nestedGroup',
    type: 'Group',
    maxCount: 5,
    children: ['nested1', 'nested2'],
    dataModelBindings: { group: 'Model.Group.Nested' },
  } as ILayoutGroup,
  nested1: {
    id: 'nested1',
    type: 'Input',
    dataModelBindings: { simpleBinding: 'Model.Group.Nested.Field1' },
  } as ILayoutComponent,
  nested2: {
    id: 'inGroup2',
    type: 'Input',
    dataModelBindings: { simpleBinding: 'Model.Group.Nested.Field2' },
  } as ILayoutComponent,
};

const layout: ILayout = [
  components.topLayer,
  components.group,
  components.inGroup1,
  components.inGroup2,
  components.nestedGroup,
  components.nested1,
  components.nested2,
];

const getState = (formData: IFormData = {}): IRuntimeState => {
  const state = getInitialStateMock();
  state.formLayout.layouts = state.formLayout.layouts || {};
  state.formLayout.layouts['myLayout'] = layout;
  state.formLayout.uiConfig.currentView = 'myLayout';
  state.formData.formData = {
    'Model.TopLayer': 'hello world',
    'Model.Group[0].Field1': 'row1-f1',
    'Model.Group[0].Field2': 'row1-f2',
    'Model.Group[0].FromServer': 'true',
    'Model.Group[0].Nested[0].Field1': 'row1-nested1-f1',
    'Model.Group[0].Nested[0].Field2': 'row1-nested1-f2',
    'Model.Group[1].Field1': 'row2-f1',
    'Model.Group[1].Field2': 'row2-f2',
    'Model.Group[1].Nested[0].Field1': 'row2-nested1-f1',
    'Model.Group[1].Nested[0].Field2': 'row2-nested1-f2',
    'Model.Group[1].Nested[1].Field1': 'row2-nested2-f1',
    'Model.Group[1].Nested[1].Field2': 'row2-nested2-f2',
    'Model.Group[1].Nested[2].Field1': 'row2-nested3-f1',
    'Model.Group[1].Nested[2].Field2': 'row2-nested3-f2',
    ...formData,
  };

  return state;
};

const thingWithExpressions = (
  expr1: ExpressionOr<'boolean'> = ['equals', ['component', components.topLayer.id], 'hello world'],
  expr2: ExpressionOr<'boolean'> = ['equals', ['component', components.topLayer.id], 'foo bar'],
): ExampleThingWithExpressions => ({
  notAnExpr: false,
  hidden: expr1,
  innerObject: {
    label: 'hello world',
    readOnly: expr2,
  },
});

const thingWithoutExpressions = (result1: boolean, result2: boolean): ExampleThingWithExpressions =>
  thingWithExpressions(result1, result2);

function render<T extends ExampleThingWithExpressions | ExampleThingWithExpressions[]>(
  thing: T,
  options: UseExpressionsOptions<T>,
  state = getState(),
) {
  let error: Error | undefined = undefined;
  const store = setupStore(state);
  const rendered = renderHook(() => useExpressions(thing, options), {
    wrapper: class Wrapper extends React.Component<React.PropsWithChildren, { hasError: boolean }> {
      constructor(props) {
        super(props);
        this.state = { hasError: false };
      }

      static getDerivedStateFromError() {
        return { hasError: true };
      }

      componentDidCatch(err: Error) {
        error = err;
      }

      render() {
        if (this.state.hasError) {
          return <span>Something went wrong</span>;
        }

        return <Provider store={store}>{this.props.children}</Provider>;
      }
    },
  });

  return {
    ...rendered,
    store,
    error: error as Error | undefined,
  };
}

describe('useExpressions', () => {
  const consoleRef: {
    log: MockInstance;
    error: MockInstance;
  } = console as any;

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();
  });
  afterEach(() => {
    jest.spyOn(console, 'error').mockClear();
    jest.spyOn(console, 'log').mockClear();
  });
  afterAll(() => {
    jest.spyOn(console, 'error').mockRestore();
    jest.spyOn(console, 'log').mockRestore();
  });

  it('should not do anything when not given any expressions', () => {
    const obj = thingWithoutExpressions(true, false);
    const { result } = render(obj, {
      forComponentId: `${components.inGroup1.id}-0`,
    });

    expect(result.current.hidden).toEqual(true);
    expect(result.current.innerObject.readOnly).toEqual(false);
    expect(result.current).toEqual(obj);
    expect(consoleRef.error).toBeCalledTimes(0);
    expect(consoleRef.log).toBeCalledTimes(0);
  });

  it('should skip evaluating null value', () => {
    const { result } = render(null as unknown as ExampleThingWithExpressions, {
      forComponentId: components.topLayer.id,
    });

    expect(result.current).toBeNull();
    expect(consoleRef.error).toBeCalledTimes(0);
    expect(consoleRef.log).toBeCalledTimes(0);
  });

  it('should resolve expressions', () => {
    const { result, store, rerender } = render(thingWithExpressions(), {
      forComponentId: components.topLayer.id,
    });

    expect(result.current.notAnExpr).toEqual(false);
    expect(result.current.hidden).toEqual(true);
    expect(result.current).toEqual(thingWithoutExpressions(true, false));

    act(() => {
      store.dispatch(
        FormDataActions.setFulfilled({
          formData: getState({
            'Model.TopLayer': 'foo bar',
          }).formData.formData,
        }),
      );
      rerender();
    });

    expect(result.current.notAnExpr).toEqual(false);
    expect(result.current.hidden).toEqual(false);
    expect(result.current).toEqual(thingWithoutExpressions(false, true));
    expect(consoleRef.error).toBeCalledTimes(0);
    expect(consoleRef.log).toBeCalledTimes(0);
  });

  const failingExpr: ExpressionOr<'boolean'> = ['greaterThanEq', ['component', components.topLayer.id], '55'];

  it('should fail hard when evaluation fails and no defaults are provided', () => {
    const { result, error } = render(thingWithExpressions(failingExpr), {
      forComponentId: components.topLayer.id,
    });

    expect(result.current).toBeNull();
    expect(error?.message).toContain('Expected number, got value "hello world"');
    expect(consoleRef.error).toBeCalledTimes(3);
    expect((consoleRef.error.mock.calls[0][0] as Error).message).toContain('Error: Evaluated expression:');
    expect((consoleRef.error.mock.calls[0][0] as Error).message).toContain('Expected number, got value "hello world"');
    expect(consoleRef.error.mock.calls[2][0]).toContain('The above error occurred in the <TestComponent> component');
    expect(consoleRef.log).toBeCalledTimes(0);
  });

  it('should fail softly when evaluation fails and defaults are provided', () => {
    const { result, error } = render(thingWithExpressions(failingExpr), {
      forComponentId: components.topLayer.id,
      defaults: {
        hidden: true,
        innerObject: {
          readOnly: false,
        },
      },
    });

    expect(result.current).toEqual(thingWithoutExpressions(true, false));
    expect(error).toBeUndefined();
    expect(consoleRef.error).toBeCalledTimes(0);
    expect(consoleRef.log).toBeCalledTimes(1);

    const log = consoleRef.log.mock.calls[0][0];
    expect(log).toContain("Evaluated expression for 'hidden' in component 'topLayer'");
    expect(log).toContain('Expected number, got value "hello world"');
    expect(log).toMatch(/Using default value instead:\n\s+%ctrue%c/);
  });

  it('should fail when source component could not be found', () => {
    const { result, error } = render(thingWithExpressions(), {
      forComponentId: `${components.topLayer.id}-0`,
      defaults: {
        hidden: true,
        innerObject: {
          readOnly: false,
        },
      },
    });

    expect(result.current).toEqual(thingWithoutExpressions(true, false));
    expect(error).toBeUndefined();
    expect(consoleRef.error).toBeCalledTimes(0);
    expect(consoleRef.log).toBeCalledTimes(2);

    const log = consoleRef.log.mock.calls[0][0];
    expect(log).toContain("Evaluated expression for 'hidden' in component 'topLayer-0'");
    expect(log).toContain(
      `Unable to evaluate expressions in context of the "topLayer-0" component (it could not be found)`,
    );
    expect(log).toMatch(/Using default value instead:\n\s+%ctrue%c/);
  });

  it('should fail when target component could not be found', () => {
    const { result, error } = render(
      thingWithExpressions(['equals', ['component', `${components.topLayer.id}-0`], 'hello world']),
      {
        forComponentId: components.topLayer.id,
        defaults: {
          hidden: true,
          innerObject: {
            readOnly: false,
          },
        },
      },
    );

    expect(result.current).toEqual(thingWithoutExpressions(true, false));
    expect(error).toBeUndefined();
    expect(consoleRef.error).toBeCalledTimes(0);
    expect(consoleRef.log).toBeCalledTimes(1);

    const log = consoleRef.log.mock.calls[0][0];
    expect(log).toContain("Evaluated expression for 'hidden' in component 'topLayer'");
    expect(log).toContain(`Unable to find component with identifier topLayer-0 or it does not have a simpleBinding`);
    expect(log).toMatch(/Using default value instead:\n\s+%ctrue%c/);
  });

  it('should not fail when source component could not be found, if it is never referenced', () => {
    const { result, error } = render(
      thingWithExpressions(['equals', 'foo bar', 'hello world'], ['greaterThan', 8, 5]),
      {
        forComponentId: `${components.topLayer.id}-0`,
      },
    );

    expect(result.current).toEqual(thingWithoutExpressions(false, true));
    expect(error).toBeUndefined();
    expect(consoleRef.error).toBeCalledTimes(0);
    expect(consoleRef.log).toBeCalledTimes(0);
  });

  it('should evaluate expressions inside arrays', () => {
    const { result } = render([thingWithExpressions(), thingWithoutExpressions(false, true), thingWithExpressions()], {
      forComponentId: components.topLayer.id,
    });

    expect(result.current[0]).toEqual(thingWithoutExpressions(true, false));
    expect(result.current[1]).toEqual(thingWithoutExpressions(false, true));
    expect(result.current[2]).toEqual(thingWithoutExpressions(true, false));
    expect(consoleRef.error).toBeCalledTimes(0);
    expect(consoleRef.log).toBeCalledTimes(0);
  });
});
