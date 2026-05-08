import { FormEngine } from '@app/form-engine';

describe('@app/form-engine integration', () => {
  it('resolves the workspace package and instantiates FormEngine', () => {
    const engine = new FormEngine();
    expect(engine).toBeInstanceOf(FormEngine);
  });

  it('returns the stub version through the public API', () => {
    expect(new FormEngine().getVersion()).toBe('0.1.0');
  });
});
