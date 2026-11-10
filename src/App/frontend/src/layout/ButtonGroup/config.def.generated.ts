import { ContainerComponent } from 'src/layout/LayoutComponent';

export abstract class ButtonGroupDef extends ContainerComponent<'ButtonGroup'> {
  protected readonly type = 'ButtonGroup';

  declare renderSummary?: never;

  declare renderSummary2?: never;
}

// Source hash: d0d72d8380569c38d496ce2dbefea5b2fc5d3bb639fd3159846ac7c3d7322d77
