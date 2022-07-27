import { getInstanceIdRegExp } from './instanceIdRegExp';

describe('instanceIdRegExp', () => {
  const instanceIdExample = '123456/75154373-aed4-41f7-95b4-e5b5115c2edc';
  const expr =
    /(\d{1,10}\/[\da-f]{8}-[\da-f]{4}-[1-5][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12})/i;
  const matchTests = (exp: RegExp) => {
    expect(`pre/${instanceIdExample}/post`.match(exp)[1]).toBe(
      instanceIdExample,
    );
  };
  it('should return only the expression if no pre- or postfix is provided', () => {
    const exp = getInstanceIdRegExp();
    expect(exp.source).toBe(expr.source);
    expect(instanceIdExample.match(exp)[1]).toBe(instanceIdExample);
    expect(exp.flags).toBe('i');
    matchTests(exp);
  });
  it('should return expression with prefix', () => {
    const exp = getInstanceIdRegExp({ prefix: 'pre' });
    expect(exp.source).toBe(`pre\\/${expr.source}`);
    expect(exp.flags).toBe('i');
    matchTests(exp);
  });
  it('should return expression with postfix', () => {
    const exp = getInstanceIdRegExp({ postfix: 'post' });
    expect(exp.source).toBe(`${expr.source}\\/post`);
    matchTests(exp);
  });
  it('should return expression with both pre and post fix', () => {
    const exp = getInstanceIdRegExp({ prefix: 'pre', postfix: 'post' });
    expect(exp.source).toBe(`pre\\/${expr.source}\\/post`);
    matchTests(exp);
  });
  it('should return expression that matches only strings ending with instanceId', () => {
    const exp = getInstanceIdRegExp({ postfix: '$' });
    expect(exp.source).toBe(`${expr.source}$`);
    expect(`some/path/ending/with/${instanceIdExample}`.match(exp)[1]).toBe(
      instanceIdExample,
    );
    expect(
      `some/path/containing/${instanceIdExample}/and/more`.match(exp),
    ).toBeNull();
  });
});
