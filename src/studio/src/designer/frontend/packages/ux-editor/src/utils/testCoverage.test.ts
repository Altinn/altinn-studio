import { testFunction } from './testCoverage';

describe('testFunction', () => {
  it('should return bar when input is bar', () => {
    const result = testFunction('bar');
    expect(result).toEqual('bar');
  });
  it('should return Hello when input is not bar', () => {
    const result = testFunction('test');
    expect(result).toEqual('Hello');
  });
});
