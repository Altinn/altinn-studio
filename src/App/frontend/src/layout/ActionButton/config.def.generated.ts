import { ActionComponent } from 'src/layout/LayoutComponent';

export abstract class ActionButtonDef extends ActionComponent<'ActionButton'> {
  protected readonly type = 'ActionButton';

  declare renderSummary?: never;

  declare renderSummary2?: never;
}

// Source hash: 6657bf894723a11534e7af71d3a03e097fe6ee2fffb5d9ba7297d7d388722ebe
