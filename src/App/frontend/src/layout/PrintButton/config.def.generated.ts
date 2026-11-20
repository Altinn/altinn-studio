import { ActionComponent } from 'src/layout/LayoutComponent';

export abstract class PrintButtonDef extends ActionComponent<'PrintButton'> {
  protected readonly type = 'PrintButton';

  declare renderSummary?: never;

  declare renderSummary2?: never;
}

// Source hash: c67cf87eca34dacc4ad868bb4ce102a19797c888c4dfa2b22a2fdbf98f33ecaf
