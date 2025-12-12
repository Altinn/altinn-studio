// __tests__/expression.test.ts
//import { evaluateExpression } from '../path/to/expressionEvaluator'; // Adjust import path

import { evaluateExpression } from 'nextsrc/nextpoc/app/expressions/evaluateExpression';

describe('Expression Evaluator (array-based)', () => {
  // Mock form data or state where components store values
  const formData = {
    firstName: 'John',
    age: '30',
    isCitizen: 'true',
    city: 'Oslo',
  };

  test('equals - should return true when component value matches', () => {
    // Expression: ["equals", ["component", "firstName"], "John"]
    const expression = ['equals', ['component', 'firstName'], 'John'];
    const result = evaluateExpression(expression, formData);
    expect(result).toBe(true);
  });

  test('equals - should return false when component value does not match', () => {
    // Expression: ["equals", ["component", "firstName"], "Jane"]
    const expression = ['equals', ['component', 'firstName'], 'Jane'];
    const result = evaluateExpression(expression, formData);
    expect(result).toBe(false);
  });

  test('not - should invert a boolean expression', () => {
    // Expression: ["not", ["equals", ["component", "firstName"], "Jane"]]
    // equals(...) above returns false, so not(...) should return true
    const expression = ['not', ['equals', ['component', 'firstName'], 'Jane']];
    const result = evaluateExpression(expression, formData);
    expect(result).toBe(true);
  });

  test('and - should return true when all sub-expressions evaluate to true', () => {
    // Expression: ["and", ["equals", ["component", "firstName"], "John"], ["equals", 2, 2]]
    const expression = ['and', ['equals', ['component', 'firstName'], 'John'], ['equals', 2, 2]];
    const result = evaluateExpression(expression, formData);
    expect(result).toBe(true);
  });

  test('and - should return false if any sub-expression is false', () => {
    // Expression: ["and", ["equals", ["component", "firstName"], "John"], ["equals", 2, 3]]
    const expression = ['and', ['equals', ['component', 'firstName'], 'John'], ['equals', 2, 3]];
    const result = evaluateExpression(expression, formData);
    expect(result).toBe(false);
  });

  test('or - should return true if at least one sub-expression is true', () => {
    // Expression: ["or", ["equals", 1, 2], ["equals", ["component", "firstName"], "John"]]
    const expression = ['or', ['equals', 1, 2], ['equals', ['component', 'firstName'], 'John']];
    const result = evaluateExpression(expression, formData);
    expect(result).toBe(true);
  });

  test('or - should return false if all sub-expressions are false', () => {
    // Expression: ["or", ["equals", 1, 2], ["equals", 2, 3]]
    const expression = ['or', ['equals', 1, 2], ['equals', 2, 3]];
    const result = evaluateExpression(expression, formData);
    expect(result).toBe(false);
  });

  test('if - should evaluate true path', () => {
    // Expression: ["if", ["equals", ["component", "firstName"], "John"], "YES", "NO"]
    const expression = ['if', ['equals', ['component', 'firstName'], 'John'], 'YES', 'NO'];
    const result = evaluateExpression(expression, formData);
    expect(result).toBe('YES');
  });

  test('if - should evaluate false path', () => {
    // Expression: ["if", ["equals", ["component", "firstName"], "Jane"], "YES", "NO"]
    const expression = ['if', ['equals', ['component', 'firstName'], 'Jane'], 'YES', 'NO'];
    const result = evaluateExpression(expression, formData);
    expect(result).toBe('NO');
  });

  test('lessThan - should return true when first number is smaller', () => {
    // Expression: ["lessThan", 5, 10]
    const expression = ['lessThan', 5, 10];
    const result = evaluateExpression(expression, formData);
    expect(result).toBe(true);
  });

  test('lessThan - should return false otherwise', () => {
    // Expression: ["lessThan", 10, 5]
    const expression = ['lessThan', 10, 5];
    const result = evaluateExpression(expression, formData);
    expect(result).toBe(false);
  });

  test('greaterThan - should return true when first number is larger', () => {
    // Expression: ["greaterThan", 10, 5]
    const expression = ['greaterThan', 10, 5];
    const result = evaluateExpression(expression, formData);
    expect(result).toBe(true);
  });

  test('greaterThan - should return false otherwise', () => {
    // Expression: ["greaterThan", 5, 10]
    const expression = ['greaterThan', 5, 10];
    const result = evaluateExpression(expression, formData);
    expect(result).toBe(false);
  });

  test('add - should add two values', () => {
    // Expression: ["add", 5, 10]
    const expression = ['add', 5, 10];
    const result = evaluateExpression(expression, formData);
    expect(result).toBe(15);
  });

  test('subtract - should subtract second value from first', () => {
    // Expression: ["subtract", 10, 3]
    const expression = ['subtract', 10, 3];
    const result = evaluateExpression(expression, formData);
    expect(result).toBe(7);
  });

  test('multiply - should multiply two values', () => {
    // Expression: ["multiply", 6, 5]
    const expression = ['multiply', 6, 5];
    const result = evaluateExpression(expression, formData);
    expect(result).toBe(30);
  });

  test('divide - should divide first value by second', () => {
    // Expression: ["divide", 20, 4]
    const expression = ['divide', 20, 4];
    const result = evaluateExpression(expression, formData);
    expect(result).toBe(5);
  });

  test('concat - should concatenate string values', () => {
    // Expression: ["concat", "Hello", " ", "World"]
    const expression = ['concat', 'Hello', ' ', 'World'];
    const result = evaluateExpression(expression, formData);
    expect(result).toBe('Hello World');
  });

  test('lowerCase - should convert string to lowercase', () => {
    // Expression: ["lowerCase", "HELLO"]
    const expression = ['lowerCase', 'HELLO'];
    const result = evaluateExpression(expression, formData);
    expect(result).toBe('hello');
  });

  test('upperCase - should convert string to uppercase', () => {
    // Expression: ["upperCase", "hello"]
    const expression = ['upperCase', 'hello'];
    const result = evaluateExpression(expression, formData);
    expect(result).toBe('HELLO');
  });
});
