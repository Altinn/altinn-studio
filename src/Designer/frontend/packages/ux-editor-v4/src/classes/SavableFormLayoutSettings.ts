import { FormLayoutSettings } from './FormLayoutSettings';
import type { ILayoutSettings } from 'app-shared/types/global';

type SaveFormLayoutSettings = (layoutSettings: ILayoutSettings) => void;

export class SavableFormLayoutSettings extends FormLayoutSettings {
  private readonly saveFormLayoutSettings: SaveFormLayoutSettings;

  constructor(layoutSettings: FormLayoutSettings, saveFormLayoutSettings: SaveFormLayoutSettings) {
    super(layoutSettings.getLayoutSettings());
    this.saveFormLayoutSettings = saveFormLayoutSettings;
  }

  public save(): SavableFormLayoutSettings {
    this.saveFormLayoutSettings(this.getLayoutSettings());
    return this;
  }
}
