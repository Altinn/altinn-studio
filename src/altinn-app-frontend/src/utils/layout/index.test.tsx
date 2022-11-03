import { LayoutStyle } from 'src/types';
import { matchLayoutComponent, shouldUseRowLayout } from 'src/utils/layout';

describe('shouldUseRowLayout', () => {
  it('Should be false when layout is column', () => {
    expect(
      shouldUseRowLayout({
        layout: LayoutStyle.Column,
        optionsCount: 2,
      }),
    ).toBe(false);
  });

  it('Should be true when layout is row', () => {
    expect(
      shouldUseRowLayout({
        layout: LayoutStyle.Row,
        optionsCount: 2,
      }),
    ).toBe(true);
  });

  it('Should be true when layout is undefined and count is less than 3', () => {
    expect(
      shouldUseRowLayout({
        layout: undefined,
        optionsCount: 1,
      }),
    ).toBe(true);

    expect(
      shouldUseRowLayout({
        layout: undefined,
        optionsCount: 2,
      }),
    ).toBe(true);
  });

  it('Should be false when layout is undefined and count is 3 or more', () => {
    expect(
      shouldUseRowLayout({
        layout: undefined,
        optionsCount: 3,
      }),
    ).toBe(false);

    expect(
      shouldUseRowLayout({
        layout: undefined,
        optionsCount: 4,
      }),
    ).toBe(false);
  });
});

describe('matchLayoutComponent', () => {
  it('should not match a component id that partially contains the tested id', () => {
    expect(
      matchLayoutComponent('abc-183d0a1c-5313-45f9-9d02-4d1b0e50b1c8', '183d0a1c-5313-45f9-9d02-4d1b0e50b1c8'),
    ).toBe(null);

    expect(
      matchLayoutComponent('183d0a1c-5313-45f9-9d02-4d1b0e50b1c8-abc', '183d0a1c-5313-45f9-9d02-4d1b0e50b1c8'),
    ).toBe(null);

    expect(
      matchLayoutComponent('123-183d0a1c-5313-45f9-9d02-4d1b0e50b1c8', '183d0a1c-5313-45f9-9d02-4d1b0e50b1c8'),
    ).toBe(null);

    expect(matchLayoutComponent('-183d0a1c-5313-45f9-9d02-4d1b0e50b1c8', '183d0a1c-5313-45f9-9d02-4d1b0e50b1c8')).toBe(
      null,
    );

    expect(matchLayoutComponent('183d0a1c-5313-45f9-9d02-4d1b0e50b1c8-', '183d0a1c-5313-45f9-9d02-4d1b0e50b1c8')).toBe(
      null,
    );
  });

  it('should match a component id that contains a postfix with an index in a repeating group', () => {
    expect(
      matchLayoutComponent('183d0a1c-5313-45f9-9d02-4d1b0e50b1c8-123', '183d0a1c-5313-45f9-9d02-4d1b0e50b1c8'),
    ).toContain('183d0a1c-5313-45f9-9d02-4d1b0e50b1c8');

    expect(
      matchLayoutComponent('183d0a1c-5313-45f9-9d02-4d1b0e50b1c8-0', '183d0a1c-5313-45f9-9d02-4d1b0e50b1c8'),
    ).toContain('183d0a1c-5313-45f9-9d02-4d1b0e50b1c8');
  });
});
