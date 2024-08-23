import { NodeNotFoundWithoutContext } from 'src/features/expressions/errors';
import { evalExpr } from 'src/features/expressions/index';
import { ExprVal } from 'src/features/expressions/types';
import type { ExprConfig } from 'src/features/expressions/types';
import type { ExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';

describe('Expressions', () => {
  it('should return default value if expression evaluates to null', () => {
    const config: ExprConfig<ExprVal.String> = {
      returnType: ExprVal.String,
      defaultValue: 'hello world',
    };

    expect(
      evalExpr(
        ['frontendSettings', 'whatever'],
        new NodeNotFoundWithoutContext('test'),
        {
          applicationSettings: {},
        } as ExpressionDataSources,
        { config },
      ),
    ).toEqual('hello world');
  });

  describe('formatDate', () => {
    it('should be able to format a date when the selected language is norwegian', () => {
      const dataSources = {
        formDataSelector: () => null,
        applicationSettings: {},
        hiddenFields: new Set<string>(),
        instanceDataSources: {},
        langToolsRef: { current: {} },
        currentLanguage: 'nb',
      } as unknown as ExpressionDataSources;
      const node = new NodeNotFoundWithoutContext('test');

      const result = evalExpr(['formatDate', '2023-10-26T13:12:38.069Z'], node, dataSources);
      expect(result).toEqual('26.10.2023');
    });

    it('should be able to format a date when the selected language is english', () => {
      const dataSources = {
        formDataSelector: () => null,
        applicationSettings: {},
        hiddenFields: new Set<string>(),
        instanceDataSources: {},
        langToolsRef: { current: {} },
        currentLanguage: 'en',
      } as unknown as ExpressionDataSources;
      const node = new NodeNotFoundWithoutContext('test');

      const result = evalExpr(['formatDate', '2023-10-26T13:12:38.069Z'], node, dataSources);
      expect(result).toEqual('10/26/23');
    });

    it('should be able to specify a custom format in which the date should be formatted', () => {
      const dataSources = {
        formDataSelector: () => null,
        applicationSettings: {},
        hiddenFields: new Set<string>(),
        instanceDataSources: {},
        langToolsRef: { current: {} },
      } as unknown as ExpressionDataSources;
      const node = new NodeNotFoundWithoutContext('test');

      const result = evalExpr(['formatDate', '2023-10-26T13:12:38.069Z', 'dd.MM'], node, dataSources);
      expect(result).toEqual('26.10');
    });
  });
});
