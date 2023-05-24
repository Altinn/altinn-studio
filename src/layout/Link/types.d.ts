import type { ILayoutCompBase } from 'src/layout/layout';

export interface ILayoutCompLink extends ILayoutCompBase<'Link'> {
  style: LinkStyle;
  openInNewTab?: boolean;
}

export type LinkStyle = 'primary' | 'secondary' | 'link';
