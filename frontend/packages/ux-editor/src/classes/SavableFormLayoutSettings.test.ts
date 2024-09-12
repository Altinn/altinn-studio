import { SavableFormLayoutSettings } from '@altinn/ux-editor/classes/SavableFormLayoutSettings';
import { formLayoutSettingsMock } from '../testing/mocks';
import { FormLayoutSettings } from '@altinn/ux-editor/classes/FormLayoutSettings';

const saveFormLayoutSettings = jest.fn();

describe('SavableFormLayoutSettings', () => {
  afterEach(() => jest.clearAllMocks());
  it('saves layoutSettings when pdfLayoutName is updated', () => {
    const savableLayoutSettings = setupLayoutSettings();
    const newPdfLayoutName = 'newPdfLayoutName';
    savableLayoutSettings.setPdfLayoutName(newPdfLayoutName);
    expect(saveFormLayoutSettings).toHaveBeenCalledTimes(1);
    expect(saveFormLayoutSettings).toHaveBeenCalledWith(savableLayoutSettings.getLayoutSettings());
    const actualNewPdfLayoutSetName = savableLayoutSettings.getPdfLayoutName();
    expect(actualNewPdfLayoutSetName).toBe(newPdfLayoutName);
  });
});

const setupLayoutSettings = (): SavableFormLayoutSettings => {
  const layoutSettings = new FormLayoutSettings(formLayoutSettingsMock);
  return new SavableFormLayoutSettings(layoutSettings, saveFormLayoutSettings);
};
