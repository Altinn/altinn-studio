import { PresentationComponent } from 'src/layout/LayoutComponent';

export abstract class Summary2Def extends PresentationComponent<'Summary2'> {
  protected readonly type = 'Summary2';

  directRender(): boolean {
    return true;
  }

  declare renderSummary?: never;

  declare renderSummary2?: never;
}

// Source hash: cc626b78ff946f37d76f5b16b34dda1c5f4452a33107eba5053770e055f98363
