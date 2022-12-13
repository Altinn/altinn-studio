import { NodeNotFoundWithoutContext } from 'src/features/expressions/errors';
import { DEFAULT_FOR_ALL_VALUES_IN_OBJ, evalExpr, evalExprInObj } from 'src/features/expressions/index';
import type { ContextDataSources } from 'src/features/expressions/ExprContext';

describe('Expressions', () => {
  it('should return default value if expression evaluates to null', () => {
    expect(
      evalExpr(
        ['frontendSettings', 'whatever'],
        new NodeNotFoundWithoutContext('test'),
        {
          applicationSettings: {},
        } as ContextDataSources,
        {
          defaultValue: 'hello world',
        },
      ),
    ).toEqual('hello world');
  });

  it('should be possible to resolve all values in an object to a default value', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    const options = {
      dataSources: {
        formData: {},
        applicationSettings: {},
        hiddenFields: new Set<string>(),
        instanceContext: {},
      } as ContextDataSources,
      node: new NodeNotFoundWithoutContext('test'),
    };

    expect(() =>
      // This one throws, because we don't supply any default value
      evalExprInObj({
        ...options,
        input: { obj: ['instanceContext', 'whatever'] },
      }),
    ).toThrow();

    expect(
      // This one does not throw, but also does not evaluate any expressions(!). This happens when you supply default
      // values, but fail to provide exhaustive ones.
      evalExprInObj({
        ...options,
        input: { obj: ['instanceContext', 'whatever'] },
        defaults: {},
      }),
    ).toEqual({ obj: ['instanceContext', 'whatever'] });

    expect(
      // When a more specific default exists, that should be used
      evalExprInObj({
        ...options,
        input: { obj: ['instanceContext', 'whatever1'], other: ['instanceContext', 'whatever2'] },
        defaults: { [DEFAULT_FOR_ALL_VALUES_IN_OBJ]: 'some-default-result', obj: 'default-for-this-one' },
      }),
    ).toEqual({ obj: 'default-for-this-one', other: 'some-default-result' });

    expect(logSpy).toHaveBeenCalledTimes(2);
  });
});
