import { ActionComponent } from 'src/layout/LayoutComponent';

export abstract class ButtonDef extends ActionComponent<'Button'> {
  protected readonly type = 'Button';

  declare renderSummary?: never;

  declare renderSummary2?: never;
}

// Source hash: 45d138bc63a0ba57fe322880422870012a7e113e12a03866c7bfa3015de7bc10
