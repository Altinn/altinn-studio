import { NodeNotFoundWithoutContext } from 'src/features/expressions/errors';
import { CONFIG_FOR_ALL_VALUES_IN_OBJ, evalExpr, evalExprInObj } from 'src/features/expressions/index';
import type { ContextDataSources } from 'src/features/expressions/ExprContext';
import type { ExprConfig } from 'src/features/expressions/types';

describe('Expressions', () => {
  it('should return default value if expression evaluates to null', () => {
    const config: ExprConfig<'string'> = {
      returnType: 'string',
      defaultValue: 'hello world',
      resolvePerRow: false,
    };

    expect(
      evalExpr(
        ['frontendSettings', 'whatever'],
        new NodeNotFoundWithoutContext('test'),
        {
          applicationSettings: {},
        } as ContextDataSources,
        { config },
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
        config: {},
      }),
    ).toEqual({ obj: ['instanceContext', 'whatever'] });

    expect(
      // When a more specific default exists, that should be used
      evalExprInObj({
        ...options,
        input: { obj: ['instanceContext', 'whatever1'], other: ['instanceContext', 'whatever2'] },
        config: {
          [CONFIG_FOR_ALL_VALUES_IN_OBJ]: {
            returnType: 'string',
            defaultValue: 'some-default-result',
            resolvePerRow: false,
          },
          obj: {
            returnType: 'string',
            defaultValue: 'default-for-this-one',
            resolvePerRow: false,
          },
        },
      }),
    ).toEqual({ obj: 'default-for-this-one', other: 'some-default-result' });

    expect(logSpy).toHaveBeenCalledTimes(2);
  });
});
