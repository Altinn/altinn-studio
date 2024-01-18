import { typedLocalStorage } from 'app-shared/utils/webStorage';
import {
  addFeatureFlagToLocalStorage,
  removeFeatureFlagFromLocalStorage,
  shouldDisplayFeature,
} from './featureToggleUtils';

describe('featureToggle localStorage', () => {
  it('should return true if feature is enabled in the localStorage', () => {
    typedLocalStorage.setItem<string[]>('featureFlags', ['shouldOverrideAppLibCheck']);
    expect(shouldDisplayFeature('shouldOverrideAppLibCheck')).toBe(true);
  });

  it('should return true if featureFlag includes in feature params', () => {
    typedLocalStorage.setItem<string[]>('featureFlags', ['demo', 'shouldOverrideAppLibCheck']);
    expect(shouldDisplayFeature('shouldOverrideAppLibCheck')).toBe(true);
  });

  it('should return false if feature is not enabled in the localStorage', () => {
    typedLocalStorage.setItem<string[]>('featureFlags', ['demo']);
    expect(shouldDisplayFeature('shouldOverrideAppLibCheck')).toBe(false);
  });

  it('should return false if feature is not enabled in the localStorage', () => {
    expect(shouldDisplayFeature('shouldOverrideAppLibCheck')).toBe(false);
  });
});

describe('featureToggle url', () => {
  it('should return true if feature is enabled in the url', () => {
    window.history.pushState({}, 'PageUrl', '/?featureFlags=shouldOverrideAppLibCheck');
    expect(shouldDisplayFeature('shouldOverrideAppLibCheck')).toBe(true);
  });

  it('should return true if featureFlag includes in feature params', () => {
    window.history.pushState({}, 'PageUrl', '/?featureFlags=demo,shouldOverrideAppLibCheck');
    expect(shouldDisplayFeature('shouldOverrideAppLibCheck')).toBe(true);
  });

  it('should return false if feature is not included in the url', () => {
    window.history.pushState({}, 'PageUrl', '/?featureFlags=demo');
    expect(shouldDisplayFeature('shouldOverrideAppLibCheck')).toBe(false);
  });

  it('should return false if feature is not included in the url', () => {
    window.history.pushState({}, 'PageUrl', '/');
    expect(shouldDisplayFeature('shouldOverrideAppLibCheck')).toBe(false);
  });
});

describe('addFeatureToLocalStorage', () => {
  beforeEach(() => {
    typedLocalStorage.removeItem('featureFlags');
  });
  it('should add feature to local storage', () => {
    addFeatureFlagToLocalStorage('shouldOverrideAppLibCheck');
    expect(typedLocalStorage.getItem<string[]>('featureFlags')).toEqual([
      'shouldOverrideAppLibCheck',
    ]);
  });
  it('should append provided feature to existing features in local storage', () => {
    typedLocalStorage.setItem<string[]>('featureFlags', ['demo']);
    addFeatureFlagToLocalStorage('shouldOverrideAppLibCheck');
    expect(typedLocalStorage.getItem<string[]>('featureFlags')).toEqual([
      'demo',
      'shouldOverrideAppLibCheck',
    ]);
  });
});

describe('removeFeatureFromLocalStorage', () => {
  beforeEach(() => {
    typedLocalStorage.removeItem('featureFlags');
  });
  it('should remove feature from local storage', () => {
    typedLocalStorage.setItem<string[]>('featureFlags', ['shouldOverrideAppLibCheck']);
    removeFeatureFlagFromLocalStorage('shouldOverrideAppLibCheck');
    expect(typedLocalStorage.getItem<string[]>('featureFlags')).toEqual([]);
  });
  it('should only remove specified feature from local storage', () => {
    typedLocalStorage.setItem<string[]>('featureFlags', ['shouldOverrideAppLibCheck', 'demo']);
    removeFeatureFlagFromLocalStorage('shouldOverrideAppLibCheck');
    expect(typedLocalStorage.getItem<string[]>('featureFlags')).toEqual(['demo']);
  });
});
