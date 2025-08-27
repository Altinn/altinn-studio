import { typedLocalStorage, typedSessionStorage } from 'libs/studio-pure-functions/src';
import {
  addFeatureFlagToLocalStorage,
  removeFeatureFlagFromLocalStorage,
  shouldDisplayFeature,
  FeatureFlag,
} from './featureToggleUtils';

describe('featureToggle localStorage', () => {
  beforeEach(() => typedLocalStorage.removeItem('featureFlags'));

  it('should return true if feature is enabled in the localStorage', () => {
    typedLocalStorage.setItem<string[]>('featureFlags', ['shouldOverrideAppLibCheck']);
    expect(shouldDisplayFeature(FeatureFlag.ShouldOverrideAppLibCheck)).toBeTruthy();
  });

  it('should return true if featureFlag includes in feature params', () => {
    typedLocalStorage.setItem<string[]>('featureFlags', ['demo', 'shouldOverrideAppLibCheck']);
    expect(shouldDisplayFeature(FeatureFlag.ShouldOverrideAppLibCheck)).toBeTruthy();
  });

  it('should return false if feature is not enabled in the localStorage', () => {
    typedLocalStorage.setItem<string[]>('featureFlags', ['demo']);
    expect(shouldDisplayFeature(FeatureFlag.ShouldOverrideAppLibCheck)).toBeFalsy();
  });

  it('should return false if feature is not enabled in the localStorage', () => {
    expect(shouldDisplayFeature(FeatureFlag.ShouldOverrideAppLibCheck)).toBeFalsy();
  });
});

describe('featureToggle url', () => {
  beforeEach(() => {
    typedLocalStorage.removeItem('featureFlags');
    typedSessionStorage.removeItem('featureFlags');
  });
  it('should return true if feature is enabled in the url', () => {
    window.history.pushState({}, 'PageUrl', '/?featureFlags=shouldOverrideAppLibCheck');
    expect(shouldDisplayFeature(FeatureFlag.ShouldOverrideAppLibCheck)).toBeTruthy();
  });

  it('should return true if featureFlag includes in feature params', () => {
    window.history.pushState({}, 'PageUrl', '/?featureFlags=demo,shouldOverrideAppLibCheck');
    expect(shouldDisplayFeature(FeatureFlag.ShouldOverrideAppLibCheck)).toBeTruthy();
  });

  it('should return false if feature is not included in the url', () => {
    window.history.pushState({}, 'PageUrl', '/?featureFlags=demo');
    expect(shouldDisplayFeature(FeatureFlag.ShouldOverrideAppLibCheck)).toBeFalsy();
  });

  it('should return false if feature is not included in the url', () => {
    window.history.pushState({}, 'PageUrl', '/');
    expect(shouldDisplayFeature(FeatureFlag.ShouldOverrideAppLibCheck)).toBeFalsy();
  });

  it('should persist features in sessionStorage when persistFeatureFlag is set in url', () => {
    window.history.pushState(
      {},
      'PageUrl',
      '/?featureFlags=addComponentModal,shouldOverrideAppLibCheck&persistFeatureFlag=true',
    );
    expect(shouldDisplayFeature(FeatureFlag.ComponentConfigBeta)).toBeFalsy();
    expect(shouldDisplayFeature(FeatureFlag.ShouldOverrideAppLibCheck)).toBeTruthy();
    expect(shouldDisplayFeature(FeatureFlag.AddComponentModal)).toBeTruthy();
    expect(typedSessionStorage.getItem<string[]>('featureFlags')).toEqual([
      'shouldOverrideAppLibCheck',
      'addComponentModal',
    ]);
    expect(typedLocalStorage.getItem<string[]>('featureFlags')).toBeNull();
  });
});

describe('addFeatureToLocalStorage', () => {
  beforeEach(() => {
    typedLocalStorage.removeItem('featureFlags');
  });
  it('should add feature to local storage', () => {
    addFeatureFlagToLocalStorage(FeatureFlag.ShouldOverrideAppLibCheck);
    expect(typedLocalStorage.getItem<string[]>('featureFlags')).toEqual([
      'shouldOverrideAppLibCheck',
    ]);
  });
  it('should append provided feature to existing features in local storage', () => {
    typedLocalStorage.setItem<string[]>('featureFlags', ['demo']);
    addFeatureFlagToLocalStorage(FeatureFlag.ShouldOverrideAppLibCheck);
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
    removeFeatureFlagFromLocalStorage(FeatureFlag.ShouldOverrideAppLibCheck);
    expect(typedLocalStorage.getItem<string[]>('featureFlags')).toEqual([]);
  });
  it('should only remove specified feature from local storage', () => {
    typedLocalStorage.setItem<string[]>('featureFlags', ['shouldOverrideAppLibCheck', 'demo']);
    removeFeatureFlagFromLocalStorage(FeatureFlag.ShouldOverrideAppLibCheck);
    expect(typedLocalStorage.getItem<string[]>('featureFlags')).toEqual(['demo']);
  });
});
