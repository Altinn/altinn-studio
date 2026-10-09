import { afterEach, describe, expect, it, vi } from 'vitest';
import { SavableFormLayoutSettings } from '@altinn/ux-editor/classes/SavableFormLayoutSettings';
import { formLayoutSettingsMock } from '../testing/mocks';
import { FormLayoutSettings } from '@altinn/ux-editor/classes/FormLayoutSettings';

const saveFormLayoutSettings = vi.fn();

describe('SavableFormLayoutSettings', () => {
  afterEach(() => vi.clearAllMocks());
  it('saves layoutSettings when save function is called', () => {
    const savableLayoutSettings = setupLayoutSettings();
    savableLayoutSettings.save();
    expect(saveFormLayoutSettings).toHaveBeenCalledTimes(1);
    expect(saveFormLayoutSettings).toHaveBeenCalledWith(savableLayoutSettings.getLayoutSettings());
  });
});

const setupLayoutSettings = (): SavableFormLayoutSettings => {
  const layoutSettings = new FormLayoutSettings(formLayoutSettingsMock);
  return new SavableFormLayoutSettings(layoutSettings, saveFormLayoutSettings);
};
