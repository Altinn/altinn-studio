import { generateTextResourceId } from './generateTextResourceId';

describe('generateTextResourceId', () => {
  it('should return id with the given prefix', () => {
    const result = generateTextResourceId('pdf-filename');

    expect(result).toMatch(/^pdf-filename-/);
  });

  it('should return unique ids on each call', () => {
    const result1 = generateTextResourceId('pdf-filename');
    const result2 = generateTextResourceId('pdf-filename');

    expect(result1).not.toBe(result2);
  });
});
