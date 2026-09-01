import { slugify } from './slugify';

describe('slugify', () => {
  it('replaces whitespace with hyphens', () => {
    expect(slugify('my-component-Et valg')).toBe('my-component-Et-valg');
  });

  it('leaves text without whitespace untouched', () => {
    expect(slugify('my-component-choice')).toBe('my-component-choice');
  });
});
