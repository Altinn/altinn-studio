import { NodeNotFoundWithoutContext } from 'src/features/expressions/errors';
import { evalExpr } from 'src/features/expressions/index';
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
});
