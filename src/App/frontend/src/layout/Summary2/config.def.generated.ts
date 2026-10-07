import { PresentationComponent } from 'src/layout/LayoutComponent';

export abstract class Summary2Def extends PresentationComponent<'Summary2'> {
  protected readonly type = 'Summary2';

  directRender(): boolean {
    return true;
  }
}

// Source hash: 2240de0a86ee2f62b3848d312486f8176ed07788534c1321e38c578c9181e750
