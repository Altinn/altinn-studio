import { typedLocalStorage } from 'app-shared/utils/webStorage';
import { addFeatureFlagToLocalStorage, removeFeatureFlagFromLocalStorage, shouldDisplayFeature } from './featureToggleUtils';

describe('featureToggle localStorage', () => {
  it('should return true if feature is enabled in the localStorage', () => {
    typedLocalStorage.setItem<string[]>('featureFlags', ['processEditor']);
    expect(shouldDisplayFeature('processEditor')).toBe(true);
  });

  it('should return true if featureFlag includes in feature params', () => {
    typedLocalStorage.setItem<string[]>('featureFlags', ['demo', 'processEditor']);
    expect(shouldDisplayFeature('processEditor')).toBe(true);
  });

  it('should return false if feature is not enabled in the localStorage', () => {
    typedLocalStorage.setItem<string[]>('featureFlags', ['demo']);
    expect(shouldDisplayFeature('processEditor')).toBe(false);
  });

  it('should return false if feature is not enabled in the localStorage', () => {
    expect(shouldDisplayFeature('processEditor')).toBe(false);
  });
});

describe('featureToggle url', () => {
  it('should return true if feature is enabled in the url', () => {
    window.history.pushState({}, 'PageUrl', '/?featureFlags=processEditor');
    expect(shouldDisplayFeature('processEditor')).toBe(true);
  });

  it('should return true if featureFlag includes in feature params', () => {
    window.history.pushState({}, 'PageUrl', '/?featureFlags=demo,processEditor');
    expect(shouldDisplayFeature('processEditor')).toBe(true);
  });

  it('should return false if feature is not included in the url', () => {
    window.history.pushState({}, 'PageUrl', '/?featureFlags=demo');
    expect(shouldDisplayFeature('processEditor')).toBe(false);
  });

  it('should return false if feature is not included in the url', () => {
    window.history.pushState({}, 'PageUrl', '/');
    expect(shouldDisplayFeature('processEditor')).toBe(false);
  });
});

describe('addFeatureToLocalStorage', () => {
  beforeEach(() => {
    typedLocalStorage.removeItem('featureFlags');
  });
  it('should add feature to local storage', () => {
    addFeatureFlagToLocalStorage('processEditor');
    expect(typedLocalStorage.getItem<string[]>('featureFlags')).toEqual(['processEditor']);
  });
  it('should append provided feature to existing features in local storage', () => {
    typedLocalStorage.setItem<string[]>('featureFlags', ['demo']);
    addFeatureFlagToLocalStorage('processEditor');
    expect(typedLocalStorage.getItem<string[]>('featureFlags')).toEqual(['demo', 'processEditor']);
  });
});

describe('removeFeatureFromLocalStorage', () => {
  beforeEach(() => {
    typedLocalStorage.removeItem('featureFlags');
  });
  it('should remove feature from local storage', () => {
    typedLocalStorage.setItem<string[]>('featureFlags', ['processEditor']);
    removeFeatureFlagFromLocalStorage('processEditor');
    expect(typedLocalStorage.getItem<string[]>('featureFlags')).toEqual([]);
  });
  it('should only remove specified feature from local storage', () => {
    typedLocalStorage.setItem<string[]>('featureFlags', ['processEditor', 'demo']);
    removeFeatureFlagFromLocalStorage('processEditor');
    expect(typedLocalStorage.getItem<string[]>('featureFlags')).toEqual(['demo']);
  });
});
