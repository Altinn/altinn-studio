import { ActionComponent } from 'src/layout/LayoutComponent';

export abstract class LinkDef extends ActionComponent<'Link'> {
  protected readonly type = 'Link';

  declare renderSummary?: never;

  declare renderSummary2?: never;
}

// Source hash: 044d3815c71cc5378970465c0fb6894b1f443e8ef2afe5f230bf7939ec68220b
