import type { IFooterBaseComponent } from 'src/features/footer/types';

export interface IFooterLinkComponent extends IFooterBaseComponent<'Link'> {
  title: string;
  target: string;
  icon?: IFooterIcon;
}
