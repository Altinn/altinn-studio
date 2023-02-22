import type { IFooterBaseComponent } from 'src/features/footer/types';

export interface IFooterPhoneComponent extends IFooterBaseComponent<'Phone'> {
  title: string;
  target: string;
}
