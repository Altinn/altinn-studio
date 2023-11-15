import { NodeNotFoundWithoutContext } from 'src/features/expressions/errors';
import { CONFIG_FOR_ALL_VALUES_IN_OBJ, evalExpr, evalExprInObj } from 'src/features/expressions/index';
import { ExprVal } from 'src/features/expressions/types';
import type { ContextDataSources } from 'src/features/expressions/ExprContext';
import type { ExprConfig } from 'src/features/expressions/types';

describe('Expressions', () => {
  it('should return default value if expression evaluates to null', () => {
    const config: ExprConfig<ExprVal.String> = {
      returnType: ExprVal.String,
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
        instanceDataSources: {},
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
            returnType: ExprVal.String,
            defaultValue: 'some-default-result',
            resolvePerRow: false,
          },
          obj: {
            returnType: ExprVal.String,
            defaultValue: 'default-for-this-one',
            resolvePerRow: false,
          },
        },
      }),
    ).toEqual({ obj: 'default-for-this-one', other: 'some-default-result' });

    expect(logSpy).toHaveBeenCalledTimes(2);
  });

  describe('formatDate', () => {
    it('should be able to format a date when the selected language is norwegian', () => {
      const dataSources = {
        formData: {},
        applicationSettings: {},
        hiddenFields: new Set<string>(),
        instanceDataSources: {},
        langTools: {
          selectedLanguage: 'nb',
        },
      } as ContextDataSources;
      const node = new NodeNotFoundWithoutContext('test');

      const result = evalExpr(['formatDate', '2023-10-26T13:12:38.069Z'], node, dataSources);
      expect(result).toEqual('26.10.2023');
    });

    it('should be able to format a date when the selected language is english', () => {
      const dataSources = {
        formData: {},
        applicationSettings: {},
        hiddenFields: new Set<string>(),
        instanceDataSources: {},
        langTools: {
          selectedLanguage: 'en',
        },
      } as ContextDataSources;
      const node = new NodeNotFoundWithoutContext('test');

      const result = evalExpr(['formatDate', '2023-10-26T13:12:38.069Z'], node, dataSources);
      expect(result).toEqual('10/26/23');
    });

    it('should be able to specify a custom format in which the date should be formatted', () => {
      const dataSources = {
        formData: {},
        applicationSettings: {},
        hiddenFields: new Set<string>(),
        instanceDataSources: {},
        langTools: {},
      } as ContextDataSources;
      const node = new NodeNotFoundWithoutContext('test');

      const result = evalExpr(['formatDate', '2023-10-26T13:12:38.069Z', 'dd.MM'], node, dataSources);
      expect(result).toEqual('26.10');
    });
  });
});
