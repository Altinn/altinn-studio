import Ajv from 'ajv';
import expressionSchema from 'schemas/json/layout/expression.schema.v1.json';

import { ExprFunctionDefinitions } from 'src/features/expressions/expression-functions';
import { ExprVal } from 'src/features/expressions/types';
import type { AnyFuncDef } from 'src/features/expressions/expression-functions';

type Func = { name: string } & AnyFuncDef;

describe('expression schema tests', () => {
  const functions: Func[] = [];
  for (const name of Object.keys(ExprFunctionDefinitions)) {
    const func = ExprFunctionDefinitions[name];
    functions.push({ name, ...func });
  }

  it.each(functions)('$name should have a valid func-$name definition', ({ name, args, returns }) => {
    if (name === 'if') {
      // if is a special case, we'll skip it here
      return;
    }

    expect(expressionSchema.definitions[`func-${name}`]).toBeDefined();
    expect(expressionSchema.definitions[`func-${name}`].type).toBe('array');
    expect(expressionSchema.definitions[`func-${name}`].items[0]).toEqual({ const: name });

    // It might be tempting to add these into the definitions to make the schema stricter and properly validate
    // min/max arguments, but this would make the schema less useful for the user, as they would not get
    // autocompletion in vscode until they had the minimum number of arguments.
    expect(expressionSchema.definitions[`func-${name}`].minItems).toBe(undefined);
    expect(expressionSchema.definitions[`func-${name}`].maxItems).toBe(undefined);

    if (returns === ExprVal.Any) {
      // At least one of the definitions should be a match
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allTypes: any[] = [];
      for (const type of ['number', 'string', 'boolean']) {
        allTypes.push(...expressionSchema.definitions[`strict-${type}`].anyOf);
      }
      expect(allTypes).toContainEqual({
        $ref: `#/definitions/func-${name}`,
      });
    } else {
      const returnString = exprValToString(returns);
      expect(expressionSchema.definitions[`strict-${returnString}`].anyOf).toContainEqual({
        $ref: `#/definitions/func-${name}`,
      });
    }

    const minArguments = args.findIndex((arg) => arg.variant === 'optional' || arg.variant === 'rest');
    const lastArgSpreads = args[args.length - 1]?.variant === 'rest';

    if (minArguments === -1) {
      expect(expressionSchema.definitions[`func-${name}`].items.length).toBe(args.length + 1);
    } else {
      expect(expressionSchema.definitions[`func-${name}`].items.length).toBeGreaterThanOrEqual(minArguments + 1);
    }

    if (lastArgSpreads) {
      const lastArg = args[args.length - 1].type;
      expect(expressionSchema.definitions[`func-${name}`].additionalItems).toEqual({ $ref: exprValToDef(lastArg) });
    } else {
      expect(expressionSchema.definitions[`func-${name}`].additionalItems).toBe(false);
    }
  });

  const ajv = new Ajv({ strict: false });
  const validate = ajv.compile(expressionSchema);

  it.each(functions)('$name should validate against generated function calls', ({ name, args }) => {
    if (name === 'if') {
      // if is a special case, we'll skip it here
      return;
    }

    const funcDef = expressionSchema.definitions[`func-${name}`];
    const lastArgSpreads = args[args.length - 1]?.variant === 'rest';

    // With exactly the right number of arguments
    const funcCall = [name, ...args.map((arg) => exprValToString(arg.type))];
    if (lastArgSpreads) {
      funcCall.push(...args.map((arg) => exprValToString(arg.type)));
    }

    // Use enum value, if defined in schema
    for (let i = 0; i < args.length; i++) {
      const argDef = funcDef.items.length > i + 1 ? funcDef.items[i + 1] : undefined;
      if (argDef?.enum) {
        funcCall[i + 1] = argDef.enum[0];
      }
    }

    const valid = validate(funcCall);
    expect(validate.errors).toEqual(null);
    expect(valid).toBe(true);

    // With too few arguments
    const funcCallMinArguments = [name];
    const validMinArguments = validate(funcCallMinArguments);

    // This always validates, because the schema allows for less than the minimum number of arguments. If it didn't,
    // you wouldn't get autocomplete for functions until you had the minimum number of arguments, which makes for
    // a bad developer experience. We test this explicitly below, even though is does not seem to be the desired
    // behavior.
    expect(validate.errors).toEqual(null);
    expect(validMinArguments).toBe(true);

    // With too many arguments
    const funcCallExtra = [name, ...args.map((arg) => exprValToString(arg.type)), 'extra'];
    const validExtra = validate(funcCallExtra);
    if (lastArgSpreads) {
      // This always validates, because the last argument spread
      expect(validate.errors).toEqual(null);
      expect(validExtra).toBe(true);
    } else {
      expect(validExtra).toBe(false);
    }
  });

  it('invalid functions should not validate', () => {
    const valid = validate(['invalid_function']);
    expect(valid).toBe(false);
  });

  it('no other function definitions should be present', () => {
    const hardcodedAllowed = new Set(['func-if-without-else', 'func-if-with-else']);
    const functionDefs = Object.keys(expressionSchema.definitions).filter((key) => key.startsWith('func-'));
    const validFunctionDefs = new Set(Object.keys(ExprFunctionDefinitions).map((name) => `func-${name}`));
    const unknownFunctionDefs = functionDefs.filter((key) => !validFunctionDefs.has(key) && !hardcodedAllowed.has(key));
    expect(unknownFunctionDefs).toEqual([]);
  });
});

function exprValToString(val: ExprVal): string {
  return val.toString().replaceAll('_', '');
}

function exprValToDef(val: ExprVal): string {
  return `#/definitions/${exprValToString(val)}`;
}
