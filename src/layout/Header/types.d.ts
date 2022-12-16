import type { ILayoutCompBase } from 'src/layout/layout';

export interface ILayoutCompHeader extends ILayoutCompBase<'Header'> {
  size: 'L' | 'M' | 'S' | 'h2' | 'h3' | 'h4';
}
