import { ActionComponent } from 'src/layout/LayoutComponent';

export abstract class NavigationBarDef extends ActionComponent<'NavigationBar'> {
  protected readonly type = 'NavigationBar';

  declare renderSummary?: never;

  declare renderSummary2?: never;
}

// Source hash: 522a33ac36ef7abe4f63988fc7e1690a3ef2832128aa49d142508de4c39e9cae
