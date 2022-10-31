import conditionalPath from './conditionalPath';

describe('conditionalPath', () => {
  it('returns an empty string if non of the params are defined', () => {
    expect(conditionalPath()).toBe('');
  })
  it('returns an empty string if appending to an empty start', () => {
    expect(conditionalPath('', 'bar')).toBe('');
    expect(conditionalPath(null, 'bar')).toBe('');
    expect(conditionalPath(undefined, 'bar')).toBe('');
  })
  it('returns the start if the appending argument is empty', () => {
    expect(conditionalPath('foo', '')).toBe('foo');
    expect(conditionalPath('foo', null)).toBe('foo');
    expect(conditionalPath('foo')).toBe('foo');
  })
  it('returns the start with the appended argument', () => {
    expect(conditionalPath('foo', 'bar')).toBe('foo/bar');
  })
})
