import type { ILayoutCompBase } from 'src/layout/layout';

export interface ILayoutCompCustom extends ILayoutCompBase<'Custom'> {
  tagName: string;
}
