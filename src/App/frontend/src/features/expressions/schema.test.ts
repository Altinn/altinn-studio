import expressionSchema from '@app/layout-contract/schemas/json/layout/expression.schema.v1.json';
import Ajv from 'ajv';
import fs from 'node:fs';
import path from 'node:path';

import { CompareOperators, ExprFunctionDefinitions } from 'src/features/expressions/expression-functions';
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

    // Adding minItems here would make editors stop offering completions for the function until it has the
    // minimum number of items. The minimum is enforced by the function-arity rules instead, see below.
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

  it.each(['object', 'strict-object', 'any'])('accepts JMESPath in %s contexts', (context) => {
    const validateContext = ajv.compile({
      $ref: `#/definitions/${context}`,
      definitions: expressionSchema.definitions,
    });

    expect(validateContext(['jmespath', ['object', 'key', 'value'], '@'])).toBe(true);
    expect(validateContext(['invalid_function'])).toBe(false);
  });

  it.each(functions)('$name should validate against generated function calls', ({ name, args }) => {
    if (name === 'if' || name === 'compare') {
      // if is a special case, we'll skip it here
      return;
    }

    const funcDef = expressionSchema.definitions[`func-${name}`];
    const lastArgSpreads = args[args.length - 1]?.variant === 'rest';

    // With exactly the right number of arguments
    const funcCall = [name, ...args.map((arg) => testArgumentFromExprVal(arg.type))];
    if (lastArgSpreads) {
      funcCall.push(...args.map((arg) => testArgumentFromExprVal(arg.type)));
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
    const minArguments = args.filter((arg) => arg.variant === 'required').length;
    for (let count = 0; count < minArguments; count++) {
      const funcCallTooFew = funcCall.slice(0, count + 1);
      expect(validate(funcCallTooFew)).toBe(false);
      expect(validate.errors?.map((error) => error.message)).toContain(
        `must NOT have fewer than ${minArguments + 1} items`,
      );
    }

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

  it.each(functions)('$name should have a function-arity rule matching its required arguments', ({ name, args }) => {
    const minArguments = args.filter((arg) => arg.variant === 'required').length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rules = (expressionSchema.definitions['function-arity'].allOf as any[]).filter(
      (rule) => rule.if.items?.[0]?.const === name,
    );

    if (minArguments === 0) {
      // Covered by the generic rule requiring the function name
      expect(rules).toEqual([]);
      return;
    }

    expect(rules).toHaveLength(1);
    // Functions with an optional keyword (if/else, compare/not) nest the minimum for the plain form in else
    const minItems = rules[0].then.minItems ?? rules[0].then.else.minItems;
    expect(minItems).toBe(minArguments + 1);
  });

  it('invalid functions should not validate', () => {
    const valid = validate(['invalid_function']);
    expect(valid).toBe(false);
  });

  // A definition that is declared twice is silently dropped when the schema is parsed (the last one wins), so
  // additions to an existing definition can look applied while having no effect at all.
  it('no definition should be declared more than once', () => {
    const schemaPath = path.resolve(
      import.meta.dirname,
      '../../../../../common/ts/layout-contract/schemas/json/layout/expression.schema.v1.json',
    );
    const rawSchema = fs.readFileSync(schemaPath, 'utf-8');
    const declarations = [...rawSchema.matchAll(/^ {4}"([^"]+)": \{$/gm)].map(([, name]) => name);
    const duplicates = declarations.filter((name, index) => declarations.indexOf(name) !== index);
    expect(duplicates).toEqual([]);
    expect(declarations.length).toBe(Object.keys(expressionSchema.definitions).length);
  });

  it('no other function definitions should be present', () => {
    const functionDefs = Object.keys(expressionSchema.definitions).filter((key) => key.startsWith('func-'));
    const validFunctionDefs = new Set([
      'func-if-without-else',
      'func-if-with-else',
      'func-compare-inverse',
      ...Object.keys(ExprFunctionDefinitions).map((name) => `func-${name}`),
    ]);
    const invalidFunctionDefs = functionDefs.filter((key) => !validFunctionDefs.has(key));
    expect(invalidFunctionDefs).toEqual([]);
  });

  it('compare operators should be valid', () => {
    const valid = new Set(Object.keys(CompareOperators));
    const operators = new Set(expressionSchema.definitions['compare-operator'].enum);
    expect(operators).toEqual(valid);
  });
});

function testArgumentFromExprVal(val: ExprVal): string | string[] {
  return val === ExprVal.List ? ['list'] : exprValToString(val);
}

function exprValToString(val: ExprVal): string {
  return val.toString().replaceAll('_', '');
}

function exprValToDef(val: ExprVal): string {
  return `#/definitions/${exprValToString(val)}`;
}
