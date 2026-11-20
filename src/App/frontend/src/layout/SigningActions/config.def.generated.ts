import { ActionComponent } from 'src/layout/LayoutComponent';

export abstract class SigningActionsDef extends ActionComponent<'SigningActions'> {
  protected readonly type = 'SigningActions';

  declare renderSummary?: never;

  declare renderSummary2?: never;
}

// Source hash: 8e6f533aa91d2ec70b9cc1f6ba9cea2fa000544f982a187b35e405725b98ca1d
