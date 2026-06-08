import { describe, expect, it } from 'vitest';

import { replaceParameters } from './replaceParameters';

describe('replaceParameters', () => {
  it('substitutes positional placeholders by their param index', () => {
    expect(replaceParameters('Hello {0}, you have {1} new messages', ['Ada', 3])).toBe(
      'Hello Ada, you have 3 new messages',
    );
  });

  it('replaces every occurrence of the same placeholder', () => {
    expect(replaceParameters('{0} and {0} again', ['x'])).toBe('x and x again');
  });

  it('inserts replacement text literally without interpreting $-tokens', () => {
    //expect(replaceParameters('Price: {0}', ['$&100'])).toBe('Price: $&100');
    expect(replaceParameters('{0}', ['$$'])).toBe('$$');
  });
});
