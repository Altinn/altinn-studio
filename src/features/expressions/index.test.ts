import { NodeNotFoundWithoutContext } from 'src/features/expressions/errors';
import { ExprFunctionDefinitions } from 'src/features/expressions/expression-functions';
import { evalExpr } from 'src/features/expressions/index';
import { ExprVal } from 'src/features/expressions/types';
import type { AnyFuncDef } from 'src/features/expressions/expression-functions';
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

  describe('all function definitions should be valid', () => {
    it.each(Object.keys(ExprFunctionDefinitions))('%s should have a valid function definition', (name) => {
      const def = ExprFunctionDefinitions[name] as AnyFuncDef;

      let optionalFound = false;
      let restFound = false;
      for (const arg of def.args) {
        if (!optionalFound && !restFound && arg.variant === 'optional') {
          optionalFound = true;
        } else if (!restFound && arg.variant === 'rest') {
          restFound = true;
        } else if (arg.variant === 'required' && (optionalFound || restFound)) {
          throw new Error('Required argument found after optional or rest argument');
        } else if (arg.variant === 'optional' && restFound) {
          throw new Error('Optional argument found after rest argument');
        } else if (arg.variant === 'rest' && restFound) {
          throw new Error('Multiple rest arguments found');
        }
      }

      if (def.returns === ExprVal.Date) {
        throw new Error(
          'Date is not a valid return type for an expression function. It is only possible to receive a Date as ' +
            'an argument, and if you need to return a Date, you should return it as a string (formatted in a way ' +
            'that lets the date parser parse it).',
        );
      }

      expect(def.returns).toBeDefined();
      expect(def.args).toBeDefined();
    });
  });
});
