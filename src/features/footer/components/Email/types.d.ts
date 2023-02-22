import type { IFooterBaseComponent } from 'src/features/footer/types';

export interface IFooterEmailComponent extends IFooterBaseComponent<'Email'> {
  title: string;
  target: string;
}
