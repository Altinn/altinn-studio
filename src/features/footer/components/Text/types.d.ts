import type { IFooterBaseComponent } from 'src/features/footer/types';

export interface IFooterTextComponent extends IFooterBaseComponent<'Text'> {
  title: string;
}
