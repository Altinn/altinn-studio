import { LayoutStyle } from 'src/types';
import { shouldUseRowLayout } from './index';

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
