import { PresentationComponent } from 'src/layout/LayoutComponent';

export abstract class SummaryDef extends PresentationComponent<'Summary'> {
  protected readonly type = 'Summary';

  directRender(): boolean {
    return true;
  }
}

// Source hash: 81d0dc28db05a5ea961f7935006604666d74b9d8c3555b0747422506289e7050
