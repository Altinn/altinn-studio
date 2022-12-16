import type { ILayoutCompBase } from 'src/layout/layout';
import type { IMapping } from 'src/types';

export interface ILayoutCompInstantiationButton extends ILayoutCompBase<'InstantiationButton'> {
  mapping?: IMapping;
}
