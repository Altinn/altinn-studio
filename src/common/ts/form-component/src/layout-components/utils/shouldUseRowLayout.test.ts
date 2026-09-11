import { shouldUseRowLayout } from './shouldUseRowLayout';

describe('shouldUseRowLayout', () => {
  it('uses a row when layout is "row", regardless of the option count', () => {
    expect(shouldUseRowLayout({ layout: 'row', optionsCount: 10 })).toBe(true);
  });

  it('uses a column when layout is "column", regardless of the option count', () => {
    expect(shouldUseRowLayout({ layout: 'column', optionsCount: 1 })).toBe(false);
  });

  it('uses a row for fewer than three options when no layout is given', () => {
    expect(shouldUseRowLayout({ optionsCount: 1 })).toBe(true);
    expect(shouldUseRowLayout({ optionsCount: 2 })).toBe(true);
  });

  it('uses a column for three or more options when no layout is given', () => {
    expect(shouldUseRowLayout({ optionsCount: 3 })).toBe(false);
    expect(shouldUseRowLayout({ optionsCount: 4 })).toBe(false);
  });

  it('falls back to the option count for the "table" layout', () => {
    expect(shouldUseRowLayout({ layout: 'table', optionsCount: 2 })).toBe(true);
    expect(shouldUseRowLayout({ layout: 'table', optionsCount: 3 })).toBe(false);
  });
});
