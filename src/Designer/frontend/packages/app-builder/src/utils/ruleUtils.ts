/**
 * Rules the app builder can edit: "show only when" and "required only when", each comparing one
 * component with one or more values. They are stored as the `hidden` and `required` expressions
 * the app evaluates. An expression this module cannot read back as a rule is left as it is, so the
 * builder never overwrites logic it does not show.
 */

export type RuleOperator = 'is' | 'isNot' | 'oneOf';

export const ruleOperators: RuleOperator[] = ['is', 'isNot', 'oneOf'];

export type Rule = {
  /** The ID of the component whose answer the rule checks. */
  componentId: string;
  operator: RuleOperator;
  /** One value for `is` and `isNot`, any number for `oneOf`. */
  values: string[];
};

type Expression = unknown;
type ComponentLookup = ['component', string];
type Comparison = ['equals' | 'notEquals', ComponentLookup, string];

/** What a `hidden` or `required` property holds, as the builder sees it. */
export type RuleProperty =
  { kind: 'always' } | { kind: 'never' } | { kind: 'rule'; rule: Rule } | { kind: 'advanced' };

/** "Show only when the rule is true" means "hidden when it is false". */
export function toHiddenExpression(rule: Rule): Expression {
  return negate(toExpression(rule));
}

export function toRequiredExpression(rule: Rule): Expression {
  return toExpression(rule);
}

export function readHiddenProperty(hidden: unknown): RuleProperty {
  if (hidden === undefined || hidden === false) return { kind: 'always' };
  if (hidden === true) return { kind: 'never' };
  const rule = readExpression(negateExpression(hidden));
  return rule ? { kind: 'rule', rule } : { kind: 'advanced' };
}

export function readRequiredProperty(required: unknown): RuleProperty {
  if (required === undefined || required === false) return { kind: 'never' };
  if (required === true) return { kind: 'always' };
  const rule = readExpression(required);
  return rule ? { kind: 'rule', rule } : { kind: 'advanced' };
}

/** Keeps the values that fit the operator when the user changes it. */
export function changeOperator(rule: Rule, operator: RuleOperator): Rule {
  const values = operator === 'oneOf' ? rule.values : [rule.values[0] ?? ''];
  return { ...rule, operator, values };
}

function toExpression({ componentId, operator, values }: Rule): Expression {
  const lookup: ComponentLookup = ['component', componentId];
  if (operator === 'is') return ['equals', lookup, values[0] ?? ''];
  if (operator === 'isNot') return ['notEquals', lookup, values[0] ?? ''];
  // With fewer than two values, "is one of" is the same as "is".
  if (values.length < 2) return ['equals', lookup, values[0] ?? ''];
  return ['or', ...values.map((value): Comparison => ['equals', lookup, value])];
}

function negate(expression: Expression): Expression {
  if (isComparison(expression)) {
    const [operator, lookup, value] = expression;
    return [operator === 'equals' ? 'notEquals' : 'equals', lookup, value];
  }
  return ['not', expression];
}

// Undoes negate, and also reads a negation written by hand.
function negateExpression(expression: Expression): Expression {
  if (Array.isArray(expression) && expression[0] === 'not' && expression.length === 2) {
    return expression[1];
  }
  return negate(expression);
}

/** Reads a condition as a rule, or returns undefined when it is not one the builder can show. */
export function readRuleExpression(expression: Expression): Rule | undefined {
  return readExpression(expression);
}

function readExpression(expression: Expression): Rule | undefined {
  if (isComparison(expression)) {
    const [operator, [, componentId], value] = expression;
    return { componentId, operator: operator === 'equals' ? 'is' : 'isNot', values: [value] };
  }
  if (!Array.isArray(expression) || expression[0] !== 'or' || expression.length < 2) {
    return undefined;
  }
  const comparisons = expression.slice(1);
  if (!comparisons.every(isComparison)) return undefined;
  const equalities = comparisons as Comparison[];
  const componentId = equalities[0][1][1];
  const isOneOf = equalities.every(
    ([operator, [, id]]) => operator === 'equals' && id === componentId,
  );
  if (!isOneOf) return undefined;
  return { componentId, operator: 'oneOf', values: equalities.map(([, , value]) => value) };
}

function isComparison(expression: Expression): expression is Comparison {
  if (!Array.isArray(expression) || expression.length !== 3) return false;
  const [operator, lookup, value] = expression;
  return (
    (operator === 'equals' || operator === 'notEquals') &&
    Array.isArray(lookup) &&
    lookup.length === 2 &&
    lookup[0] === 'component' &&
    typeof lookup[1] === 'string' &&
    typeof value === 'string'
  );
}

/** A field a rule can check, with the values it can be compared with. */
export type RuleField = {
  componentId: string;
  values: string[];
};

/**
 * A rule to start from when the user adds one: the first field with options, checked against its
 * first option, so the rule works before the user changes it.
 */
export function createDefaultRule(fields: RuleField[]): Rule | undefined {
  const field = fields.find(({ values }) => values.length > 0) ?? fields[0];
  if (!field) return undefined;
  return { componentId: field.componentId, operator: 'is', values: [field.values[0] ?? ''] };
}
