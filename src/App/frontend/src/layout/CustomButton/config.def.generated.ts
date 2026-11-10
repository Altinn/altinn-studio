import { ActionComponent } from 'src/layout/LayoutComponent';

export abstract class CustomButtonDef extends ActionComponent<'CustomButton'> {
  protected readonly type = 'CustomButton';

  declare renderSummary?: never;

  declare renderSummary2?: never;
}

// Source hash: e9b5b0d8768044a0d137149f967834ba9dc413612dcd401ba7acf63c3a1055cf
