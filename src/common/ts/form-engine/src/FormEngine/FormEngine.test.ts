import { FormEngine } from './FormEngine';

describe('FormEngine', () => {
  it('constructs without throwing', () => {
    expect(() => new FormEngine()).not.toThrow();
  });

  it('exposes getVersion() returning the package version string', () => {
    const engine = new FormEngine();
    expect(engine.getVersion()).toBe('0.1.0');
  });
});
