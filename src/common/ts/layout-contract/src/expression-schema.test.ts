import Ajv from 'ajv';
import { describe, expect, it } from 'vitest';

import expressionSchema from '../schemas/json/layout/expression.schema.v1.json';

type Definition = {
  minItems?: number;
  allOf?: unknown;
  items?: { const?: string }[];
};
type ArityRule = { if: { items?: { const?: string }[] } };

const definitions = expressionSchema.definitions as unknown as Record<string, Definition>;
const arityRules = definitions['function-arity'].allOf as ArityRule[];
const functionDefinitions = Object.keys(definitions).filter((name) => name.startsWith('func-'));
const functionNames = functionDefinitions
  .map((name) => definitions[name].items?.[0]?.const)
  .filter((name) => name !== undefined);

const ajv = new Ajv({ strict: false });
const validate = ajv.compile(expressionSchema);
const validateBoolean = ajv.compile({
  $ref: '#/definitions/boolean',
  definitions: expressionSchema.definitions,
});

describe('expression schema', () => {
  it('leaves minItems out of the function definitions so editors keep offering completions', () => {
    for (const name of functionDefinitions) {
      expect(definitions[name].minItems, name).toBeUndefined();
    }
  });

  it('checks the number of arguments from every expression entry point', () => {
    for (const name of ['any', 'string', 'boolean', 'number', 'list', 'object']) {
      expect(definitions[name].allOf, name).toEqual([{ $ref: '#/definitions/function-arity' }]);
    }
  });

  it('only has arity rules for functions that exist', () => {
    for (const rule of arityRules) {
      const name = rule.if.items?.[0]?.const;
      if (name !== undefined) {
        expect(functionNames).toContain(name);
      }
    }
  });

  it('accepts its own examples', () => {
    for (const example of expressionSchema.examples) {
      expect(validate(example), JSON.stringify(example)).toBe(true);
    }
  });

  const accepted: unknown[] = [
    ['jmespath', ['dataModel', 'a'], 'query'],
    ['dataModel', 'a'],
    ['dataModel', 'a', 'dataType'],
    ['if', true, 'a'],
    ['if', true, 'a', 'else', 'b'],
    ['compare', 1, 'equals', 2],
    ['compare', 1, 'not', 'equals', 2],
    ['and', true],
    ['plus', 1],
    ['round', 1.5],
    ['stringSlice', 'a', 1],
    ['concat'],
    ['language'],
    ['gatewayAction'],
    ['value'],
    ['list'],
    ['object'],
    null,
    'constant',
    5,
    true,
  ];
  for (const expression of accepted) {
    it(`accepts ${JSON.stringify(expression)}`, () => {
      expect(validate(expression)).toBe(true);
    });
  }

  const rejected: unknown[] = [
    [],
    ['jmespath'],
    ['jmespath', ['dataModel', 'a']],
    ['dataModel'],
    ['equals', 'a'],
    ['if', true],
    ['if', true, 'a', 'else'],
    ['compare', 1, 'equals'],
    ['compare', 1, 'not', 'equals'],
    ['and'],
    ['plus'],
    ['stringSlice', 'a'],
    ['stringReplace', 'a', 'b'],
    ['average', ['list', 1]],
    ['equals', ['dataModel'], 'a'],
    ['and', ['equals', 'a', 'b'], ['not']],
  ];
  for (const expression of rejected) {
    it(`rejects ${JSON.stringify(expression)}`, () => {
      expect(validate(expression)).toBe(false);
      expect(validate.errors?.map((error) => error.message)).toContainEqual(
        expect.stringMatching(/^must NOT have fewer than \d+ items$/),
      );
    });
  }

  it('rejects too few arguments in typed contexts', () => {
    expect(validateBoolean(['equals', 'a', 'b'])).toBe(true);
    expect(validateBoolean(['equals', 'a'])).toBe(false);
  });
});
