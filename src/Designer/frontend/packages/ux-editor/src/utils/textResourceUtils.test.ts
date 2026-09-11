import { getTextResourceId } from './textResourceUtils';

describe('getTextResourceId', () => {
  it('returns plain text and text resource keys', () => {
    expect(getTextResourceId('resource-key')).toBe('resource-key');
  });

  it('does not present an expression as a text resource key', () => {
    expect(getTextResourceId(['concat', 'prefix-', ['component', 'source']])).toBeUndefined();
  });
});
