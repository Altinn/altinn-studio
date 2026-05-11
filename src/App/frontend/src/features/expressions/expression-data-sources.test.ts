import { ExprFunctionDefinitions } from 'src/features/expressions/expression-functions';
import { ExpressionDataSourcesKeys } from 'src/utils/layout/useExpressionDataSources';

describe('Expression data sources', () => {
  it('should not declare any unused keys', () => {
    const usedKeys = new Set(Object.values(ExprFunctionDefinitions).flatMap((definition) => definition.needs));

    const unusedKeys = ExpressionDataSourcesKeys.filter((key) => !usedKeys.has(key));
    expect(unusedKeys).toEqual([]);
  });
});
